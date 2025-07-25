jest.mock('jsonwebtoken');
jest.mock('../models/UserDetails');

const jwt = require('jsonwebtoken');
const User = require('../models/UserDetails');
process.env.JWT_SECRET = 'test_secret';
const {
  getModules,
  createModule,
  updateModule,
  deleteModule
} = require('../controllers/moduleController');

describe('getModules', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches modules when token is valid', async () => {
    const decodedToken = { email: 'test@test.com' };
    jwt.verify.mockReturnValue(decodedToken);

    const mockUser = {
        email: 'test@test.com',
        modules: [
            {
                code: 'CS2030',
                name: 'Programming Methodology II',
                category: 'Core Programme Requirement',
                units: 4,
                completed: true,
                grade: 'A',
                year: '1',
                semester: '2',
                isSU: false,
                _id: '1',
            },
            {
                code: 'BT2102',
                name: 'Data Management and Visualisation',
                category: 'Core Programme Requirement',
                units: 4,
                completed: true,
                grade: 'A',
                year: '1',
                semester: '2',
                isSU: false,
                _id: '2',
            }
        ]
    };
    User.findOne.mockResolvedValue(mockUser);

    const mockReq = {
        body: {
            token: 'valid_token'
        }
    };
    const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
    };
    await getModules(mockReq, res);

    expect(jwt.verify).toHaveBeenCalledWith('valid_token', 'test_secret');
    expect(User.findOne).toHaveBeenCalledWith({ email: 'test@test.com' });

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
        status: 'ok',
        data: mockUser.modules
    });
  });

  it('returns error when token is missing', async () => {
    const mockReq = {
      body: {}
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    await getModules(mockReq, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      status: 'error',
      data: 'Token is required'
    });
  });

  it('returns error when user is not found', async () => {
    const decodedToken = { email: 'test@test.com' };
    jwt.verify.mockReturnValue(decodedToken);

    User.findOne.mockResolvedValue(null);

    const mockReq = {
        body: {
            token: 'valid_token'
        }
    };
    const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
    };
    await getModules(mockReq, res);

    expect(jwt.verify).toHaveBeenCalledWith('valid_token', 'test_secret');

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      status: 'error',
      data: 'User not found'
    });
  });
});

describe('createModule', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("add new module to user's modules successfully", async () => {
    const decodedToken = { email: 'test@test.com' };
    jwt.verify.mockReturnValue(decodedToken);

    const mockUser = {
      email: 'test@test.com',
      modules: [],
      save: jest.fn().mockResolvedValue(true)
    };
    User.findOne.mockResolvedValue(mockUser);

    const newModule = {
      code: 'CS2030',
      name: 'Programming Methodology II',
      category: 'Core Programme Requirement',
      units: 4,
      completed: false,
      grade: '',
      year: '',
      semester: '',
      isSU: false,
      _id: '1'
    };
    const mockReq = {
      body: {
        token: 'valid_token',
        module: newModule
      }
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    await createModule(mockReq, res);

    expect(jwt.verify).toHaveBeenCalledWith('valid_token', 'test_secret');
    expect(User.findOne).toHaveBeenCalledWith({ email: 'test@test.com' });
    expect(mockUser.modules).toContainEqual(newModule);
    expect(mockUser.save).toHaveBeenCalled();

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      status: 'ok',
      data: 'Module added successfully',
      id: newModule._id
    });
  });

  it ('returns error when module is missing', async () => {
    const decodedToken = { email: 'test@test.com' };
    jwt.verify.mockReturnValue(decodedToken);
   
    const mockReq = {
      body: {
        token: 'valid_token'
      }
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    await createModule(mockReq, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      status: 'error',
      data: 'Token and module data required'
    });
  });

  it('returns error when user is not found', async () => {
    const decodedToken = { email: 'test@test.com' };
    jwt.verify.mockReturnValue(decodedToken);

    User.findOne.mockResolvedValue(null);

    const newModule = {
      code: 'CS2030',
      name: 'Programming Methodology II',
      category: 'Core Programme Requirement',
      units: 4,
      completed: false,
      grade: '',
      year: '',
      semester: '',
      isSU: false,
      _id: '1'
    };

    const mockReq = {
      body: {
        token: 'valid_token',
        module: newModule
      }
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    await createModule(mockReq, res);

    expect(jwt.verify).toHaveBeenCalledWith('valid_token', 'test_secret');

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      status: 'error',
      data: 'User not found'
    });
  });

  it('returns error when user has duplicated modules', async () => {
    const decodedToken = { email: 'test@test.com' };
    jwt.verify.mockReturnValue(decodedToken);

    const mockUser = {
      email: 'test@test.com',
      modules: [
        {
          code: 'CS2030',
          name: 'Programming Methodology II',
          category: 'Core Programme Requirement',
          units: 4,
          completed: false,
          grade: '',
          year: '',
          semester: '',
          isSU: false,
          _id: '1'
        }
      ],
      save: jest.fn().mockResolvedValue(true)
    };
    User.findOne.mockResolvedValue(mockUser);

    const newModule = {
      code: 'CS2030',
      name: 'Programming Methodology II',
      category: 'Core Programme Requirement',
      units: 4,
      completed: false,
      grade: '',
      year: '',
      semester: '',
      isSU: false,
      _id: '1'
    };

    const mockReq = {
      body: {
        token: 'valid_token',
        module: newModule
      }
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    await createModule(mockReq, res);

    expect(jwt.verify).toHaveBeenCalledWith('valid_token', 'test_secret');
    expect(User.findOne).toHaveBeenCalledWith({ email: 'test@test.com' });
    expect(mockUser.modules).toContainEqual(newModule);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      status: 'error',
      data: 'Module with this code or name already exists'
    });
  });
});

describe('updateModule', () => {
  it("updates user's existing module successfully", async () => {
    const decodedToken = { email: 'test@test.com' };
    jwt.verify.mockReturnValue(decodedToken);

    const mockUser = {
      email: 'test@test.com',
      modules: [
        {
          code: 'CS2030',
          name: 'Programming Methodology II',
          category: 'Core Programme Requirement',
          units: 4,
          completed: false,
          grade: '',
          year: '',
          semester: '',
          isSU: false,
          _id: '1'
        }
      ],
      save: jest.fn().mockResolvedValue(true)
    };
    User.findOne.mockResolvedValue(mockUser);

    const updatedModule = {
      code: 'CS2030',
      name: 'Programming Methodology II',
      category: 'Core Programme Requirement',
      units: 4,
      completed: true,
      grade: 'A',
      year: '1',
      semester: '2',
      isSU: false,
    };
    const mockReq = {
      body: {
        token: 'valid_token',
        moduleId: '1',
        updatedData: updatedModule
      }
    };
    const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
    };
    await updateModule(mockReq, res);

    expect(jwt.verify).toHaveBeenCalledWith('valid_token', 'test_secret');
    expect(User.findOne).toHaveBeenCalledWith({ email: 'test@test.com' });
    expect(mockUser.modules[0]).toEqual(updatedModule);
    expect(mockUser.save).toHaveBeenCalled();

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      status: 'ok',
      data: 'Module updated successfully'
    });
  });

  it('returns error when module data is missing', async () => {
    const decodedToken = { email: 'test@test.com' };
    jwt.verify.mockReturnValue(decodedToken);

    const mockReq = {
      body: {
        token: 'valid_token',
        moduleId: '1'
      }
    };
    const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
    };
    await updateModule(mockReq, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      status: 'error',
      data: 'Token, moduleId and updatedData required'
    });
  });

  it('returns error when user is not found', async () => {
    const decodedToken = { email: 'test@test.com' };
    jwt.verify.mockReturnValue(decodedToken);

    User.findOne.mockResolvedValue(null);

    const updatedModule = {
      code: 'CS2030',
      name: 'Programming Methodology II',
      category: 'Core Programme Requirement',
      units: 4,
      completed: true,
      grade: 'A',
      year: '1',
      semester: '2',
      isSU: false,
    };
    const mockReq = {
      body: {
        token: 'valid_token',
        moduleId: '1',
        updatedData: updatedModule
      }
    };
    const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
    };
    await updateModule(mockReq, res);

    expect(jwt.verify).toHaveBeenCalledWith('valid_token', 'test_secret');

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      status: 'error',
      data: 'User not found'
    });
  });

  it('returns error when user has duplicated modules', async () => {
    const decodedToken = { email: 'test@test.com' };
    jwt.verify.mockReturnValue(decodedToken);

    const mockUser = {
      email: 'test@test.com',
      modules: [
        {
          code: 'CS2030',
          name: 'Programming Methodology II',
          category: 'Core Programme Requirement',
          units: 4,
          completed: false,
          grade: '',
          year: '',
          semester: '',
          isSU: false,
          _id: '1'
        },
        {
          code: 'CS2030',
          name: 'Programming Methodology II',
          category: 'Core Programme Requirement',
          units: 4,
          completed: true,
          grade: 'A',
          year: '1',
          semester: '2',
          isSU: false,
          _id: '2'
        }
      ],
      save: jest.fn().mockResolvedValue(true)
    };
    User.findOne.mockResolvedValue(mockUser);

    const updatedModule = {
      code: 'CS2030',
      name: 'Programming Methodology II',
      category: 'Core Programme Requirement',
      units: 4,
      completed: true,
      grade: 'A',
      year: '1',
      semester: '2',
      isSU: false,
    };
    const mockReq = {
      body: {
        token: 'valid_token',
        moduleId: '2',
        updatedData: updatedModule
      }
    };
    const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
    };
    await updateModule(mockReq, res);

    expect(jwt.verify).toHaveBeenCalledWith('valid_token', 'test_secret');
    expect(User.findOne).toHaveBeenCalledWith({ email: 'test@test.com' });

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      status: 'error',
      data: 'Another module with this code or name exists'
    });
  });

  it("returns error when module is not found in user's existing modules", async () => {
    const decodedToken = { email: 'test@test.com' };
    jwt.verify.mockReturnValue(decodedToken);

    const mockUser = {
      email: 'test@test.com',
      modules: [],
      save: jest.fn().mockResolvedValue(true)
    };
    User.findOne.mockResolvedValue(mockUser);

    const updatedModule = {
      code: 'CS2030',
      name: 'Programming Methodology II',
      category: 'Core Programme Requirement',
      units: 4,
      completed: true,
      grade: 'A',
      year: '1',
      semester: '2',
      isSU: false,
    };
    const mockReq = {
      body: {
        token: 'valid_token',
        moduleId: '1',
        updatedData: updatedModule
      }
    };
    const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
    };
    await updateModule(mockReq, res);

    expect(jwt.verify).toHaveBeenCalledWith('valid_token', 'test_secret');
    expect(User.findOne).toHaveBeenCalledWith({ email: 'test@test.com' });

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      status: 'error',
      data: 'Module not found'
    });
  });
});

describe('deleteModule', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("deletes user's module successfully", async () => {
    const decodedToken = { email: 'test@test.com' };
    jwt.verify.mockReturnValue(decodedToken);

    const mockUser = {
      email: 'test@test.com',
      modules: [
        {
          code: 'CS2030',
          name: 'Programming Methodology II',
          category: 'Core Programme Requirement',
          units: 4,
          completed: false,
          grade: '',
          year: '',
          semester: '',
          isSU: false,
          _id: '1'
        }
      ],
      save: jest.fn().mockResolvedValue(true)
    };
    User.findOne.mockResolvedValue(mockUser);

    const mockReq = {
      body: {
        token: 'valid_token',
        moduleId: '1'
      }
    };
    const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
    };
    await deleteModule(mockReq, res);

    expect(jwt.verify).toHaveBeenCalledWith('valid_token', 'test_secret');
    expect(User.findOne).toHaveBeenCalledWith({ email: 'test@test.com' });
    expect(mockUser.modules).toEqual([]);
    expect(mockUser.save).toHaveBeenCalled();
    
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      status: 'ok',
      message: 'Module deleted'
    });
  });

  it('returns error when module ID is missing', async () => {
    const decodedToken = { email: 'test@test.com' };
    jwt.verify.mockReturnValue(decodedToken);

    const mockUser = {
      email: 'test@test.com',
      modules: [
        {
          code: 'CS2030',
          name: 'Programming Methodology II',
          category: 'Core Programme Requirement',
          units: 4,
          completed: false,
          grade: '',
          year: '',
          semester: '',
          isSU: false,
          _id: '1'
        }
      ],
      save: jest.fn().mockResolvedValue(true)
    };
    User.findOne.mockResolvedValue(mockUser);

    const mockReq = {
      body: {
        token: 'valid_token'
      }
    };
    const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
    };
    await deleteModule(mockReq, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      status: 'error',
      message: 'Token and moduleId required'
    });
  });

  it('returns error when user is not found', async () => {
    const decodedToken = { email: 'test@test.com' };
    jwt.verify.mockReturnValue(decodedToken);

    User.findOne.mockResolvedValue(null);

    const mockReq = {
      body: {
        token: 'valid_token',
        moduleId: '1'
      }
    };
    const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
    };
    await deleteModule(mockReq, res);

    expect(jwt.verify).toHaveBeenCalledWith('valid_token', 'test_secret');

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      status: 'error',
      message: 'User not found'
    });
  });
});