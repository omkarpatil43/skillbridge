/**
 * OCR Service — Gemini 3.6 Flash Multimodal
 * ──────────────────────────────────────────
 * Uses the already-configured Gemini API for ID card analysis.
 * Primary path: structured JSON extraction via Gemini vision.
 * Fallback path: regex-based batch year extraction from raw text.
 */

import sharp from 'sharp';
import { GoogleGenAI } from '@google/genai';

// ── Types ──

export interface IdCardAnalysis {
  batchYears: string | null;        // "YYYY-YYYY"
  batchStartYear: number | null;
  batchEndYear: number | null;
  rollNumber: string | null;
  studentName: string | null;
  confidence: 'high' | 'medium' | 'low';
  rawText?: string;
}

// ── Image Pre-Processing ──

/**
 * Pre-process ID card image for optimal OCR accuracy.
 * Pipeline: auto-orient → resize → normalize contrast → sharpen → PNG
 * Runs in ~50-200ms on a typical phone photo.
 */
export const preprocessImage = async (imageBuffer: Buffer): Promise<Buffer> => {
  return sharp(imageBuffer)
    .rotate()                         // Auto-orient from EXIF
    .resize(2048, 2048, {             // Cap at 2048px, maintain aspect ratio
      fit: 'inside',
      withoutEnlargement: true,
    })
    .normalize()                      // Stretch brightness histogram
    .sharpen({ sigma: 1.2 })          // Mild unsharp mask for blurry text
    .png({ quality: 90 })             // Standardise format
    .toBuffer();
};

// ── Gemini Vision Analysis (Primary Path) ──

const ID_CARD_PROMPT = `You are analyzing a college student ID card image. Extract the following information:

1. **Batch Years**: Look for a year range in "YYYY-YYYY" format (e.g., "2023-2027", "2024-2028"). This indicates the student's enrollment period. It may appear as "Batch: 2023-2027" or "Duration: 2023-2027" or simply as two years separated by a dash/hyphen.

2. **Roll Number**: Look for a roll number or registration number (e.g., "24CS042", "C2K23106145", "PICT-2024-042"). It's usually a short alphanumeric code.

3. **Student Name**: The student's full name on the card.

Respond with ONLY a JSON object in this exact format (no markdown, no code fences):
{"batchYears": "2023-2027", "rollNumber": "24CS042", "studentName": "Aarav Sharma", "confidence": "high"}

Rules for the "confidence" field:
- "high": Text is clearly readable, you are very confident in all extracted fields.
- "medium": Some text is partially obscured or blurry but you could make reasonable guesses.
- "low": The image is very blurry, has heavy glare, or you cannot reliably read the text.

If you cannot find a field, set it to null. If the image does not appear to be an ID card at all, set confidence to "low" and all fields to null.`;

import Tesseract from 'tesseract.js';

export const parsePictCardText = (text: string): {
  startYear: number | null;
  endYear: number | null;
  batchYears: string | null;
  rollNumber: string | null;
  studentName: string | null;
  department: string | null;
} => {
  let startYear: number | null = null;
  let endYear: number | null = null;

  // 1. Matches:
  // "Validity : JUL-2025 - JUN-2029"
  // "Validity : JUL-2025 - JUN-2429" (common OCR typo for 2029)
  // "Validity : 2025 - 2029"
  const validityMatch = text.match(/(?:Validity|Valid)?\s*[:.-]?\s*(?:[A-Z]{3}[-–—\s]*)?(20\d{2})\s*[-–—to]+\s*(?:[A-Z]{3}[-–—\s]*)?(\d{4})/i);
  if (validityMatch) {
    startYear = parseInt(validityMatch[1], 10);
    const parsedEnd = parseInt(validityMatch[2], 10);
    endYear = (parsedEnd - startYear === 4) ? parsedEnd : startYear + 4;
  }

  if (!startYear) {
    const julMatch = text.match(/(?:JUL|AUG|SEP)[-–—\s]*(20\d{2})/i);
    if (julMatch) {
      startYear = parseInt(julMatch[1], 10);
      endYear = startYear + 4;
    }
  }

  // 2. Extract Enrollment / Roll Number
  let rollNumber: string | null = null;
  const enrlMatch = text.match(/Enrl(?:\.|\s)*No(?:\.|\s)*:?\s*([A-Z0-9]+)/i);
  if (enrlMatch) {
    rollNumber = enrlMatch[1].toUpperCase();
    if (!startYear) {
      const yearInRoll = rollNumber.match(/(?:[A-Z]+)?(2[0-9])/i);
      if (yearInRoll) {
        startYear = 2000 + parseInt(yearInRoll[1], 10);
        endYear = startYear + 4;
      }
    }
  }

  // 3. Fallback to general YYYY-YYYY range
  if (!startYear) {
    const fallbackYears = extractBatchYearsFromText(text);
    if (fallbackYears) {
      startYear = fallbackYears.startYear;
      endYear = fallbackYears.endYear;
    }
  }

  // 4. Extract Student Name
  let studentName: string | null = null;
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const deptIdx = lines.findIndex(l => /(?:Electronics|Computer|Information|Artificial|Mechanical|Civil)\s*(?:and|Engineering|Technology)?/i.test(l));
  if (deptIdx > 0) {
    const candidate = lines[deptIdx - 1];
    if (candidate && candidate.length > 2 && !/INSTITUTE|STUDENT|Autonomous|PICT|SCTR/i.test(candidate)) {
      studentName = candidate.replace(/[^a-zA-Z\s]/g, '').trim();
    }
  }

  // 5. Department
  let department: string | null = null;
  if (/Electronics\s+and\s+Telecommunication/i.test(text)) {
    department = 'Electronics & Telecommunication';
  } else if (/Computer\s+Engineering/i.test(text)) {
    department = 'Computer Science & Engg';
  } else if (/Information\s+Technology/i.test(text)) {
    department = 'Information Technology';
  } else if (/Artificial\s+Intelligence/i.test(text)) {
    department = 'Artificial Intelligence & Data Science';
  }

  return {
    startYear,
    endYear,
    batchYears: startYear && endYear ? `${startYear}-${endYear}` : null,
    rollNumber,
    studentName,
    department,
  };
};

export const runLocalPictOcr = async (imageBuffer: Buffer): Promise<IdCardAnalysis | null> => {
  const angles = [0, 270, 90, 180];
  let bestText = '';
  let bestScore = -1;

  for (const angle of angles) {
    try {
      const rotated = await sharp(imageBuffer).rotate(angle).png().toBuffer();
      const { data: { text } } = await Tesseract.recognize(rotated, 'eng');
      const score = (text.match(/INSTITUTE|COMPUTER|TECHNOLOGY|STUDENT|Validity|Engineering|PICT|Enrl|JUL-|JUN-/gi) || []).length;
      if (score > bestScore) {
        bestScore = score;
        bestText = text;
      }
      if (score >= 3) break; // Excellent orientation found
    } catch {
      // try next angle
    }
  }

  if (!bestText || bestScore < 1) return null;

  const parsed = parsePictCardText(bestText);
  return {
    batchYears: parsed.batchYears,
    batchStartYear: parsed.startYear,
    batchEndYear: parsed.endYear,
    rollNumber: parsed.rollNumber,
    studentName: parsed.studentName,
    confidence: bestScore >= 3 ? 'high' : 'medium',
    rawText: bestText,
  };
};

/**
 * Analyse an ID card image using Gemini Vision + Local Multi-Angle OCR.
 * Returns structured extraction results.
 */
export const analyzeIdCard = async (imageBuffer: Buffer): Promise<IdCardAnalysis> => {
  const apiKey = process.env.GEMINI_API_KEY;

  // Path A: Try Gemini multimodal vision if API key is configured
  if (apiKey && apiKey !== 'replace-with-your-google-gemini-api-key' && apiKey.trim().length > 10) {
    try {
      const processed = await preprocessImage(imageBuffer);
      const base64Image = processed.toString('base64');
      const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
      const candidateModels = Array.from(new Set([
        process.env.GEMINI_MODEL || 'gemini-3.6-flash',
        'gemini-3.6-flash',
        'gemini-3.8-flash',
        'gemini-2.5-flash',
        'gemini-flash-latest',
      ]));

      for (const modelName of candidateModels) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: [{
              role: 'user',
              parts: [
                { text: ID_CARD_PROMPT },
                { inlineData: { mimeType: 'image/png', data: base64Image } },
              ],
            }],
            config: { temperature: 0.1, maxOutputTokens: 512 },
          });

          const rawText = response.text?.trim() || '';
          if (rawText) {
            const jsonStr = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
            const parsed = JSON.parse(jsonStr) as {
              batchYears?: string | null;
              rollNumber?: string | null;
              studentName?: string | null;
              confidence?: string | null;
            };

            const result: IdCardAnalysis = {
              batchYears: parsed.batchYears || null,
              batchStartYear: null,
              batchEndYear: null,
              rollNumber: parsed.rollNumber || null,
              studentName: parsed.studentName || null,
              confidence: (['high', 'medium', 'low'].includes(parsed.confidence || '')
                ? parsed.confidence as 'high' | 'medium' | 'low'
                : 'low'),
              rawText,
            };

            if (result.batchYears) {
              const years = extractBatchYearsFromText(result.batchYears);
              if (years) {
                result.batchStartYear = years.startYear;
                result.batchEndYear = years.endYear;
              }
            }

            if (result.batchStartYear) return result;
          }
        } catch (modelErr) {
          console.warn(`Gemini OCR model ${modelName} error:`, modelErr);
        }
      }
    } catch (genAiErr) {
      console.warn('Gemini ID card OCR failed, falling back to local multi-angle OCR:', genAiErr);
    }
  }

  // Path B: Highly accurate local multi-angle Tesseract OCR with PICT template parsing
  try {
    const localResult = await runLocalPictOcr(imageBuffer);
    if (localResult && localResult.batchStartYear) {
      return localResult;
    }
  } catch (localErr) {
    console.warn('Local OCR processing error:', localErr);
  }

  return {
    batchYears: null,
    batchStartYear: null,
    batchEndYear: null,
    rollNumber: null,
    studentName: null,
    confidence: 'low',
    rawText: '',
  };
};

// ── Regex Fallback: Batch Year Extraction ──

/**
 * Normalize common OCR misreads and extract a YYYY-YYYY pattern.
 * Handles: dash variants (–, —, ‐, −), O/0 confusion, stray chars.
 */
export const extractBatchYearsFromText = (
  text: string,
): { startYear: number; endYear: number } | null => {
  // Normalize dash variants to standard hyphen
  let normalized = text
    .replace(/[–—‐−‑⁃]/g, '-')   // en-dash, em-dash, hyphen variants
    .replace(/\s*-\s*/g, '-')      // strip spaces around dashes
    .replace(/[Oo]/g, (match) => {
      // Only replace O→0 if it's adjacent to digits (year context)
      return match;
    });

  // Fix O/0 confusion specifically in year-like patterns
  // Match patterns like 2O23-2O27 and fix them
  normalized = normalized.replace(
    /([12])([Oo])(\d{2})/g,
    (_match, prefix, _o, suffix) => `${prefix}0${suffix}`,
  );

  // Look for YYYY-YYYY pattern
  const yearRangeRegex = /\b(20\d{2})-(20\d{2})\b/g;
  const matches: { start: number; end: number }[] = [];

  let match: RegExpExecArray | null;
  while ((match = yearRangeRegex.exec(normalized)) !== null) {
    const start = parseInt(match[1], 10);
    const end = parseInt(match[2], 10);
    if (end > start && end - start <= 6) {  // Reasonable academic range
      matches.push({ start, end });
    }
  }

  if (matches.length === 0) return null;

  // Prefer a 4-year range (standard program duration)
  const fourYearMatch = matches.find(m => m.end - m.start === 4);
  const best = fourYearMatch || matches[0];

  return { startYear: best.start, endYear: best.end };
};

/**
 * Map confidence string to a numeric score (0–1).
 */
export const confidenceToScore = (confidence: 'high' | 'medium' | 'low'): number => {
  switch (confidence) {
    case 'high': return 0.95;
    case 'medium': return 0.70;
    case 'low': return 0.30;
  }
};

/**
 * Check if the confidence meets the threshold for auto-verification.
 */
export const meetsConfidenceThreshold = (confidence: 'high' | 'medium' | 'low'): boolean => {
  const threshold = parseFloat(process.env.OCR_CONFIDENCE_THRESHOLD || '0.80');
  return confidenceToScore(confidence) >= threshold;
};
