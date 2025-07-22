jest.mock('../models/UserDetails');
jest.mock('bcrypt');
jest.mock('jsonwebtoken');

const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../models/UserDetails');
process.env.JWT_SECRET = 'test_secret';
const {
  register,
  login,
  userData,
  updateUserData,
  uploadProfilePic
} = require('../controllers/userController');

describe('register', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates new user when info is valid', async () => {
    User.findOne.mockResolvedValue(false);
    bcrypt.hash.mockResolvedValue('hashed_pass');
    User.create.mockResolvedValue();

    const mockUserData = {
      body: {
        name: 'Test',
        course: 'CS',
        year: 1,
        semester: 1,
        email: 'test@test.com', 
        password: 'pass'
      }
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      send: jest.fn() 
    };
    await register(mockUserData, res);

    expect(User.findOne).toHaveBeenCalledWith({ email: 'test@test.com' });
    expect(bcrypt.hash).toHaveBeenCalledWith('pass', 10);
    expect(User.create).toHaveBeenCalledWith({
      name: 'Test',
      course: 'CS',
      year: 1,
      semester: 1,
      email: 'test@test.com', 
      password: 'hashed_pass'
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      status: 'ok',
      data: 'User created'
    });
  });

  it('rejects existing user', async () => {
    User.findOne.mockResolvedValue(true);

    const mockUserData = {
      body: {
        name: 'Test',
        course: 'CS',
        year: 1,
        semester: 1,
        email: 'test@test.com', 
        password: 'hashed_pass'
      }
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      send: jest.fn() 
    };
    await register(mockUserData, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      status: 'error',
      data: 'User already exists'
    });
  });

  it('rejects missing fields', async () => {
    const mockUserData = {
      body: {
        name: 'Test',
        course: 'CS',
        year: 1,
        semester: 1,
        email: '', //missing email
        password: 'pass'
      }
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      send: jest.fn() 
    };
    await register(mockUserData, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      status: 'error',
      data: 'All fields except modules are required'
    });
  });
});

describe('login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('logs in user when info is valid', async () => {
    const mockUserData = {
      email: 'test@test.com',
      password: 'hashed_pass',
    };
    const findOneMock = {
      select: jest.fn().mockResolvedValue(mockUserData)
    };
    User.findOne.mockReturnValue(findOneMock);
    bcrypt.compare.mockResolvedValue(true);
    jwt.sign.mockReturnValue('mock_token');

    const mockUserLogin = {
      body: {
        email: 'test@test.com',
        password: 'correct_password'
      }
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    await login(mockUserLogin, res);

    expect(User.findOne).toHaveBeenCalledWith({ 
      email: 'test@test.com' 
    });

    expect(User.findOne().select).toHaveBeenCalledWith('+password');

    expect(bcrypt.compare).toHaveBeenCalledWith(
      'correct_password',
      'hashed_pass'
    );
    
    expect(jwt.sign).toHaveBeenCalledWith(
      { email: 'test@test.com' },
      'test_secret'
    );
    
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      status: 'ok',
      data: 'mock_token'
    });
  });

  it('rejects non-existent user', async () => {
    User.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(null)
    });

    const mockUserLogin = {
      body: {
        email: 'test@test.com',
        password: 'wrong_password'
      }
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    await login(mockUserLogin, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      status: 'error', 
      data: "User doesn't exist"
    });
  });

  it('rejects invalid password', async () => {
    const mockUserData = {
        email: 'test@test.com',
        password: 'correct_hashed_password',
    };
    User.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue(mockUserData)
    });
    bcrypt.compare.mockResolvedValue(false);

    const mockUserLogin = {
      body: {
        email: 'test@test.com',
        password: 'wrong_password'
      }
    };
    const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
    };
    await login(mockUserLogin, res);

    expect(bcrypt.compare).toHaveBeenCalledWith(    
        'wrong_password',
        'correct_hashed_password'
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
        status: 'error', 
        data: 'Invalid password'
    });
  });
});

describe('userData', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns user data when token is valid', async () => {
        const decodedToken = { email: 'test@test.com' };
        jwt.verify.mockReturnValue(decodedToken);
        
        const mockUserData = { 
            name: 'Test User',
            course: 'CS',
            year: 1,
            semester: 1,
            email: 'test@test.com',
            timetable: '',
            profilePic: '',
            modules: [],
            friends: []
        };
        const findOneMock = {
            select: jest.fn().mockResolvedValue(mockUserData)
        };
        User.findOne.mockReturnValue(findOneMock);

        const req = {
            body: { token: 'valid_token' }
        };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        await userData(req, res);

        expect(jwt.verify).toHaveBeenCalledWith('valid_token', 'test_secret');
        expect(User.findOne).toHaveBeenCalledWith({ email: 'test@test.com' });

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            status: 'ok',
            data: mockUserData
        });
    });

    it('returns error when token is valid but non-existent user', async () => {
        const decodedToken = { email: 'test@test.com' };
        jwt.verify.mockReturnValue(decodedToken);

        const findOneMock = {
            select: jest.fn().mockResolvedValue(null)
        };
        User.findOne.mockReturnValue(findOneMock);

        const req = {
            body: { token: 'valid_token' }
        };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        await userData(req, res);

        expect(jwt.verify).toHaveBeenCalledWith('valid_token', 'test_secret');

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({
            status: 'error',
            data: 'User not found'
        });
    });

    it('returns error when token is invalid', async () => {
        jwt.verify.mockImplementation(() => {
            throw new Error('Invalid token');
        });

        const req = {
            body: { token: 'invalid_token' }
        };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        await userData(req, res);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
            status: 'error',
            data: 'Invalid token'
        });
    });
});
