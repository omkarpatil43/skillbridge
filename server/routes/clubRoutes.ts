import { Router, Request, Response } from 'express';
import { ClubModel } from '../models/Club.js';
import { ClubRegistrationModel } from '../models/ClubRegistration.js';

export const clubRouter = Router();


 // GET /api/clubs
clubRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const clubs = await ClubModel.find().sort({ memberCount: -1 });
    return res.json(clubs);
  } catch (error) {
    console.error('MongoDB fetching clubs failed:', error);
    return res.status(500).json({
      error: 'Failed to fetch clubs from the database',
    });
  }
});


 // POST /api/clubs (Create new club)
clubRouter.post('/', async (req: Request, res: Response) => {
  try {
    const data = req.body;

    if (!data.name || !data.category) {
      return res.status(400).json({
        error: 'Club name and category are required',
      });
    }

    const newClubData = {
      id: `club-${Date.now()}`,
      name: data.name,
      category: data.category,
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

    const newClub = await ClubModel.create(newClubData);

    return res.status(201).json(newClub);
  } catch (error) {
    console.error('Error creating club in MongoDB:', error);
    return res.status(500).json({
      error: 'Failed to create club in the database',
    });
  }
});



 // PUT /api/clubs/:id (Update existing club)
clubRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const { _id, __v, ...updates } = req.body;

    const updatedClub = await ClubModel.findOneAndUpdate(
      { id: req.params.id },
      { $set: updates },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedClub) {
      return res.status(404).json({
        error: 'Club not found',
      });
    }

    return res.status(200).json(updatedClub);
  } catch (error) {
    console.error('Error updating club in MongoDB:', error);
    return res.status(500).json({
      error: 'Failed to update club in the database',
    });
  }
});



 // DELETE /api/clubs/:id (Delete club)
clubRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const deletedClub = await ClubModel.findOneAndDelete({
      id: req.params.id,
    });

    if (!deletedClub) {
      return res.status(404).json({
        error: 'Club not found',
      });
    }

    await ClubRegistrationModel.deleteMany({
      clubId: req.params.id,
    });

    return res.status(200).json({
      success: true,
      message: 'Club and its registrations deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting club from MongoDB:', error);
    return res.status(500).json({
      error: 'Failed to delete club from the database',
    });
  }
});


 // POST /api/clubs/:id/events (Add event to a club)
clubRouter.post('/:id/events', async (req: Request, res: Response) => {
  try {
    const data = req.body;

    if (!data.title || !data.date || !data.venue) {
      return res.status(400).json({
        error: 'Event title, date and venue are required',
      });
    }

    const newEvent = {
      id: `ev-${Date.now()}`,
      clubId: req.params.id,
      title: data.title,
      date: data.date,
      time: data.time || '10:00 AM IST',
      venue: data.venue,
      description: data.description || '',
      bannerImage: data.bannerImage || '',
      registrationLink: data.registrationLink || '',
      registrationOpen: true,
      registeredCount: 0,
      tags: data.tags || ['Event'],
    };

    const updatedClub = await ClubModel.findOneAndUpdate(
      { id: req.params.id },
      {
        $push: {
          events: {
            $each: [newEvent],
            $position: 0,
          },
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedClub) {
      return res.status(404).json({
        error: 'Club not found',
      });
    }

    return res.status(201).json(newEvent);
  } catch (error) {
    console.error('Error adding club event to MongoDB:', error);
    return res.status(500).json({
      error: 'Failed to add event to the database',
    });
  }
});


 // POST /api/clubs/register (Register for a club)
clubRouter.post('/register', async (req: Request, res: Response) => {
  try {
    const {
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
    } = req.body;

  if (
  !clubId ||
  !studentName ||
  !rollNo ||
  !email ||
  !branch ||
  !year ||
  !interestReason ||
  !phone ||
  !skills ||
  !experience
) {
  return res.status(400).json({
    error: 'Please provide all required registration fields',
  });
}

    const club = await ClubModel.findOne({ id: clubId });

    if (!club) {
      return res.status(404).json({
        error: 'Club not found',
      });
    }

    const registration = await ClubRegistrationModel.create({
      id: `registration-${Date.now()}`,
      clubId,
      clubName: clubName || club.name,
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
      status: 'pending',
    });

    return res.status(201).json(registration);
  } catch (error) {
    console.error('Error creating club registration in MongoDB:', error);
    return res.status(500).json({
      error: 'Failed to create club registration in the database',
    });
  }
});

 // GET /api/clubs/registrations (Fetch registrations)
clubRouter.get('/registrations', async (_req: Request, res: Response) => {
  try {
    const registrations = await ClubRegistrationModel.find().sort({
      createdAt: -1,
    });

    return res.status(200).json(registrations);
  } catch (error) {
    console.error('Error fetching club registrations from MongoDB:', error);
    return res.status(500).json({
      error: 'Failed to fetch club registrations from the database',
    });
  }
});


 // DELETE /api/clubs/events/:id (Delete event)
clubRouter.delete('/events/:id', async (req: Request, res: Response) => {
  try {
    const deletedEvent = await ClubModel.findOneAndUpdate(
      { 'events.id': req.params.id },
      {
        $pull: {
          events: { id: req.params.id },
        },
      },
      { new: true }
    );

    if (!deletedEvent) {
      return res.status(404).json({
        error: 'Event not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Event deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting club event from MongoDB:', error);
    return res.status(500).json({
      error: 'Failed to delete event from the database',
    });
  }
});


 // DELETE /api/clubs/registrations/:id
clubRouter.delete('/registrations/:id', async (req: Request, res: Response) => {
  try {
    const deletedRegistration = await ClubRegistrationModel.findOneAndDelete({
      id: req.params.id,
    });

    if (!deletedRegistration) {
      return res.status(404).json({
        error: 'Registration not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Registration deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting club registration from MongoDB:', error);
    return res.status(500).json({
      error: 'Failed to delete registration from the database',
    });
  }
});



 // PUT /api/clubs/registrations/:id/accept
clubRouter.put('/registrations/:id/accept', async (req: Request, res: Response) => {
  try {
    const registration = await ClubRegistrationModel.findOneAndUpdate(
      { id: req.params.id },
      { $set: { status: 'accepted' } },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!registration) {
      return res.status(404).json({
        error: 'Registration not found',
      });
    }

    return res.status(200).json(registration);
  } catch (error) {
    console.error('Error accepting club registration:', error);
    return res.status(500).json({
      error: 'Failed to accept registration in the database',
    });
  }
});



 // PUT /api/clubs/registrations/:id/reject
clubRouter.put('/registrations/:id/reject', async (req: Request, res: Response) => {
  try {
    const registration = await ClubRegistrationModel.findOneAndUpdate(
      { id: req.params.id },
      { $set: { status: 'rejected' } },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!registration) {
      return res.status(404).json({
        error: 'Registration not found',
      });
    }

    return res.status(200).json(registration);
  } catch (error) {
    console.error('Error rejecting club registration:', error);
    return res.status(500).json({
      error: 'Failed to reject registration in the database',
    });
  }
});




 // POST /api/clubs/events/:id/rsvp
clubRouter.post('/events/:id/rsvp', async (req: Request, res: Response) => {
  try {
    const updatedClub = await ClubModel.findOneAndUpdate(
      {
        events: {
          $elemMatch: {
            id: req.params.id,
            registrationOpen: { $ne: false },
          },
        },
      },
      {
        $inc: {
          'events.$.registeredCount': 1,
        },
      },
      { new: true }
    );

    if (!updatedClub) {
      return res.status(404).json({
        error: 'Event not found or registration is closed',
      });
    }

    const event = updatedClub.events.find(
      (item: any) => item.id === req.params.id
    );

    return res.status(200).json({
      success: true,
      event,
    });
  } catch (error) {
    console.error('Error registering RSVP in MongoDB:', error);
    return res.status(500).json({
      error: 'Failed to register RSVP in the database',
    });
  }
});

