import { Router, Request, Response } from 'express';
import { ClubModel } from '../models/Club.js';
import { ClubRegistrationModel } from '../models/ClubRegistration.js';
import { db } from '../db.js';

export const clubRouter = Router();

// GET /api/clubs
clubRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const clubs = await ClubModel.find().sort({ memberCount: -1 });
    if (clubs && clubs.length > 0) return res.json(clubs);
  } catch (error) {
    console.warn('MongoDB fetching clubs failed, using persistent local store:', error);
  }
  return res.json(db.getClubs());
});

// POST /api/clubs (Create new club)
clubRouter.post('/', async (req: Request, res: Response) => {
  try {
    const data = req.body;
    if (!data.name || !data.category) {
      return res.status(400).json({ error: 'Club name and category are required' });
    }
    const newClubData = {
      id: `club-${Date.now()}`,
      name: data.name,
      category: data.category || 'Technical',
      tagline: data.tagline || '',
      description: data.description || '',
      logo: data.logo || 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=400&q=80',
      banner: data.banner || 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80',
      leadName: data.leadName || '',
      leadRole: data.leadRole || 'Club Lead / President',
      leadEmail: data.leadEmail || '',
      leadPhone: data.leadPhone || '',
      recruitmentOpen: data.recruitmentOpen ?? true,
      memberCount: data.memberCount || 1,
      socialLinks: data.socialLinks || {},
      events: [],
    };

    db.addClub(newClubData as any);
    try {
      await ClubModel.create(newClubData);
    } catch {
      // ignore
    }
    return res.status(201).json(newClubData);
  } catch (error) {
    console.error('Error creating club:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/clubs/:id (Update existing club)
clubRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const localUpdated = db.updateClub(req.params.id, req.body);
    try {
      await ClubModel.findOneAndUpdate(
        { id: req.params.id },
        req.body,
        { new: true }
      );
    } catch {
      // ignore
    }
    if (!localUpdated) {
      return res.status(404).json({ error: 'Club not found' });
    }
    return res.json(localUpdated);
  } catch (error) {
    console.error('Error updating club:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/clubs/:id (Delete a club and its registrations)
clubRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    db.removeClub(req.params.id);
    try {
      await ClubModel.findOneAndDelete({ id: req.params.id });
      await ClubRegistrationModel.deleteMany({ clubId: req.params.id });
    } catch {
      // ignore
    }
    return res.json({ success: true, message: `Club deleted successfully` });
  } catch (error) {
    console.error('Error deleting club:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/clubs/:id/events (Add event to a club)
clubRouter.post('/:id/events', async (req: Request, res: Response) => {
  try {
    const { title, date, time, venue, description, bannerImage, registrationLink, tags } = req.body;
    if (!title || !date || !venue) {
      return res.status(400).json({ error: 'Title, date, and venue are mandatory' });
    }

    const club = await ClubModel.findOne({ id: req.params.id });
    if (!club) {
      return res.status(404).json({ error: 'Club not found' });
    }

    const newEvent = {
      id: `ev-${Date.now()}`,
      clubId: req.params.id,
      title,
      date,
      time: time || '10:00 AM IST',
      venue,
      description: description || 'Campus club workshop/event.',
      bannerImage: bannerImage || 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=800&q=80',
      registrationLink,
      registrationOpen: true,
      registeredCount: 0,
      tags: tags || ['Event'],
    };

    club.events.unshift(newEvent);
    await club.save();

    return res.status(201).json(newEvent);
  } catch (error) {
    console.error('Error adding club event:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/clubs/register (Apply for club membership)
clubRouter.post('/register', async (req: Request, res: Response) => {
  try {
    const { clubId, clubName, studentName, rollNo, email, branch, year, interestReason, phone, skills, experience, portfolioLink } = req.body;
    if (!clubId || !studentName || !rollNo || !interestReason || !phone || !skills || !experience) {
      return res.status(400).json({ error: 'Incomplete application data' });
    }

    const regData = {
      clubId,
      clubName,
      studentName,
      rollNo,
      email,
      branch,
      year,
      interestReason,
      phone,
      skills,
      experience,
      portfolioLink,
    };

    const localSaved = db.registerForClub(regData);

    try {
      await ClubRegistrationModel.create({
        ...localSaved,
        id: localSaved.id,
      });
    } catch {
      // MongoDB offline/auth failure - local storage is persisted
    }

    return res.status(201).json(localSaved);
  } catch (error) {
    console.error('Error registering for club:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/clubs/registrations
clubRouter.get('/registrations', async (_req: Request, res: Response) => {
  try {
    try {
      const registrations = await ClubRegistrationModel.find().sort({ createdAt: -1 });
      if (registrations && registrations.length > 0) return res.json(registrations);
    } catch {
      // MongoDB offline/auth failure
    }
    const localRegs = db.getClubRegistrations();
    return res.json(localRegs);
  } catch (error) {
    console.error('Error fetching club registrations:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/clubs/events/:id
clubRouter.delete('/events/:id', async (req: Request, res: Response) => {
  try {
    const eventId = req.params.id;
    db.removeClubEvent(eventId);
    try {
      const club = await ClubModel.findOne({ 'events.id': eventId });
      if (club) {
        club.events = club.events.filter(ev => ev.id !== eventId);
        await club.save();
      }
    } catch {
      // ignore
    }
    return res.json({ success: true, message: 'Event removed' });
  } catch (error) {
    console.error('Error deleting club event:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/clubs/registrations/:id
clubRouter.delete('/registrations/:id', async (req: Request, res: Response) => {
  try {
    db.removeClubRegistration(req.params.id);
    try {
      await ClubRegistrationModel.findOneAndDelete({ id: req.params.id });
    } catch {
      // ignore
    }
    return res.json({ success: true, message: 'Registration removed' });
  } catch (error) {
    console.error('Error deleting club registration:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/clubs/registrations/:id/accept
clubRouter.put('/registrations/:id/accept', async (req: Request, res: Response) => {
  try {
    const localUpdated = db.acceptClubRegistration(req.params.id);
    try {
      await ClubRegistrationModel.findOneAndUpdate(
        { id: req.params.id },
        { status: 'accepted' },
        { new: true }
      );
    } catch {
      // ignore
    }
    return res.json(localUpdated || { id: req.params.id, status: 'accepted' });
  } catch (error) {
    console.error('Error accepting registration:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

clubRouter.put('/registrations/:id/reject', async (req: Request, res: Response) => {
  try {
    const localUpdated = db.rejectClubRegistration(req.params.id);
    try {
      await ClubRegistrationModel.findOneAndUpdate(
        { id: req.params.id },
        { status: 'reviewed' },
        { new: true }
      );
    } catch {
      // ignore
    }
    return res.json(localUpdated || { id: req.params.id, status: 'reviewed' });
  } catch (error) {
    console.error('Error rejecting registration:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});


// POST /api/clubs/events/:id/rsvp
clubRouter.post('/events/:id/rsvp', async (req: Request, res: Response) => {
  try {
    const eventId = req.params.id;
    const updated = await ClubModel.findOneAndUpdate(
      { 'events.id': eventId },
      { $inc: { 'events.$.registeredCount': 1 } },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: 'Event not found' });
    }

    return res.json({ success: true, message: 'RSVP registered successfully' });
  } catch (error) {
    console.error('Error in event RSVP:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
