jest.mock('jsonwebtoken');
jest.mock('bcrypt');
jest.mock('../models/UserDetails');
jest.mock('../utils/nusmods');
jest.mock('../utils/timetable');

const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../models/UserDetails');
const nusmods = require('../utils/nusmods');
const timetable = require('../utils/timetable');
process.env.JWT_SECRET = 'test_secret';
const {
  timetableGen,
  timetableSnapshot
} = require('../controllers/timetableController');

describe('timetableGen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('generates timetable successfully', async () => {
    jwt.verify.mockReturnValue({ email: 'test@test.com' });

    const mockTimetable = [
        {
            modCode: 'CS2030',
            startTime: '1100',
            endTime: '1200',
            weeks: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
            day: 'Wednesday',
            venue: 'COM1-0207',
            lessonType: 'Recitation',
        },
        {
            modCode: 'BT2102',
            startTime: '0900',
            endTime: '1100',
            weeks: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
            day: 'Wednesday',
            venue: 'COM1-0209',
            lessonType: 'Tutorial',
        }
    ];
    nusmods.fetchModTimetable.mockResolvedValue({});
    timetable.generatePopulation.mockReturnValue([mockTimetable]);
    timetable.evolve.mockReturnValue([mockTimetable]);
    timetable.calcScore.mockReturnValue(100);

    const mockReq = {
        body: {
            token: 'valid_token',
            modCodes: ['CS2030', 'BT2102'],
            semester: 2,
            acadYear: '2025/2026',
            preferences: [{ id: 'noMon', rank: 1 }]
        }
    };
    const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
    };
    await timetableGen(mockReq, res);
    
    expect(jwt.verify).toHaveBeenCalledWith('valid_token', 'test_secret');
    expect(nusmods.fetchModTimetable).toHaveBeenCalledWith('2025/2026', 'CS2030', 2);
    expect(timetable.evolve).toHaveBeenCalledTimes(100);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
        status: 'ok',
        data: mockTimetable,
    });
  });

  it('returns error when no valid timetable found', async () => {
    jwt.verify.mockReturnValue({});
    nusmods.fetchModTimetable.mockResolvedValue({});
    timetable.generatePopulation.mockReturnValue([]);
    timetable.evolve.mockReturnValue([]);
    timetable.calcScore.mockReturnValue(-Infinity);

    const mockReq = {
        body: {
            token: 'valid_token',
            modCodes: ['CS2030', 'BT2102'],
            semester: 2,
            acadYear: '2025/2026',
            preferences: [{ id: 'noMon', rank: 1 }]
        }
    };
    const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
    };
    await timetableGen(mockReq, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        data: 'No valid timetable found with given constraints',
    });
  });

  it('returns error when token is invalid', async () => {
    jwt.verify.mockImplementation(() => {
      const error = new Error('Invalid token');
      error.name = 'JsonWebTokenError';
      throw error;
    });

    const mockReq = {
        body: {
            token: 'invalid_token',
            modCodes: ['CS2030', 'BT2102'],
            semester: 2,
            acadYear: '2025/2026',
            preferences: [{ id: 'noMon', rank: 1 }]
        }
    };
    const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
    };
    await timetableGen(mockReq, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        data: 'Invalid token',
    });
  });

  it('returns error when modules data fetch fails', async () => {
    jwt.verify.mockReturnValue({});
    nusmods.fetchModTimetable.mockRejectedValue(new Error('API error'));

    const mockReq = {
        body: {
            token: 'valid_token',
            modCodes: ['CS2030', 'BT2102'],
            semester: 2,
            acadYear: '2025/2026',
            preferences: [{ id: 'noMon', rank: 1 }]
        }
    };
    const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
    };
    await timetableGen(mockReq, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        data: 'Failed to generate timetable',
    });
  });
});

describe('timetableSnapshot', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('saves timetable snapshot successfully', async () => {
    jwt.verify.mockReturnValue({ email: 'test@test.com' });
    
    const mockUser = {
        save: jest.fn().mockResolvedValue(true)
    };
    User.findOne.mockResolvedValue(mockUser);
    
    const mockReq = {
        body: {
            token: 'valid_token',
            timetable: 'base64_timetable_image_data'
        }
    };
    const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
    };
    await timetableSnapshot(mockReq, res);

    expect(jwt.verify).toHaveBeenCalledWith('valid_token', 'test_secret');
    expect(User.findOne).toHaveBeenCalledWith({ email: 'test@test.com' });
    expect(mockUser.timetable).toBe('base64_timetable_image_data');
    expect(mockUser.save).toHaveBeenCalled();

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: 'Timetable snapshot saved successfully',
    });
  });

  it('returns error when token is invalid', async () => {
    jwt.verify.mockImplementation(() => {
      const error = new Error('Invalid token');
      error.name = 'JsonWebTokenError';
      throw error;
    });

    const mockReq = {
        body: {
            token: 'valid_token',
            timetable: 'base64_timetable_image_data'
        }
    };
    const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
    };
    await timetableSnapshot(mockReq, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        data: 'Invalid token',
    });
  });
});