jest.mock('jsonwebtoken');
jest.mock('../models/UserDetails');
jest.mock('../models/FriendRequest');

const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/UserDetails');
const FriendRequest = require('../models/FriendRequest');
process.env.JWT_SECRET = 'test_secret';
const {
  getFriendsDetails,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  pendingFriendRequests,
  deleteFriend
} = require('../controllers/friendController');

describe('getFriendsDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns friends' details successfully", async () => {
    const mockFriends = [
      {
        _id: '1',
        name: 'Alice',
        email: 'alice@test.com',
        timetable: 'base64string1',
        profilePic: 'alice.jpg',
        toObject: function () {
          return {
            _id: this._id,
            name: this.name,
            email: this.email,
            timetable: this.timetable,
            profilePic: this.profilePic,
          };
        }
      },
      {
        _id: '2',
        name: 'Bob',
        email: 'bob@test.com',
        timetable: 'base64string2',
        profilePic: 'bob.jpg',
        toObject: function() {
          return {
            _id: this._id,
            name: this.name,
            email: this.email,
            timetable: this.timetable,
            profilePic: this.profilePic,
          };
        }
      }
    ];
    const findOneMock = {
      select: jest.fn().mockResolvedValue(mockFriends)
    };
    User.find.mockReturnValue(findOneMock);

    const mockReq = {
      body: {
        friendIds: ['1', '2']
      }
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    await getFriendsDetails(mockReq, res);

    expect(User.find).toHaveBeenCalledWith({
      _id: { $in: mockReq.body.friendIds }
    });
    expect(findOneMock.select).toHaveBeenCalledWith("_id name email timetable profilePic");

    expect(res.json).toHaveBeenCalledWith({
      friends: [
        {
          _id: '1',
          email: 'alice@test.com',
          name: 'Alice',
          profilePic: 'alice.jpg',
          timetable: 'base64string1'
        },
        {
          _id: '2',
          email: 'bob@test.com',
          name: 'Bob',
          profilePic: 'bob.jpg',
          timetable: 'base64string2'
        }
      ]
    });
  });

  it('returns error when friend IDs are invalid', async () => {
    const mockReq = {
      body: {
        friendIds: 'invalid'
      }
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    await getFriendsDetails(mockReq, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Invalid friend IDs provided" });
  });
});

describe('sendFriendRequest', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sends friend request successfully', async () => {
    const mockFromUser = {
        _id: new mongoose.Types.ObjectId(),
        name: 'From User',
        course: 'Computer Science',
        year: 2,
        semester: 1,
        email: 'from_user@test.com',
        password: 'password',
        timetable: 'base64string',
        profilePic: 'from_user.jpg',
        modules: [],
        friends: []        
    };

    const mockToUser = {
        _id: new mongoose.Types.ObjectId(),
        name: 'To User',
        course: 'Business Analytics',
        year: 2,
        semester: 1,
        email: 'to_user@test.com',
        password: 'password',
        timetable: 'base64string',
        profilePic: 'to_user.jpg',
        modules: [],
        friends: []
    };

    jwt.verify.mockReturnValue({ email: mockFromUser.email });
    User.findOne
      .mockResolvedValueOnce(mockFromUser)
      .mockResolvedValueOnce(mockFromUser)
      .mockResolvedValueOnce(mockToUser);
    FriendRequest.findOne.mockResolvedValue(null);
    FriendRequest.create.mockResolvedValue({ from: mockFromUser._id, to: mockToUser._id });

    const mockReq = {
      body: {
        fromEmail: mockFromUser.email,
        toEmail: mockToUser.email
      },
      headers: { authorization: 'Bearer valid_token' }
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    await sendFriendRequest(mockReq, res);

    expect(jwt.verify).toHaveBeenCalledWith('valid_token', 'test_secret');
    expect(FriendRequest.create).toHaveBeenCalledWith({
        from: mockFromUser._id,
        to: mockToUser._id
    });

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      message: "Friend request sent successfully",
      request: { from: mockFromUser._id, to: mockToUser._id }
    });
  });

  it('returns error if toEmail is missing', async () => {
    const mockFromUser = {
        _id: new mongoose.Types.ObjectId(),
        name: 'From User',
        course: 'Computer Science',
        year: 2,
        semester: 1,
        email: 'from_user@test.com',
        password: 'password',
        timetable: 'base64string',
        profilePic: 'from_user.jpg',
        modules: [],
        friends: []        
    };

    const mockReq = {
      body: {
        fromEmail: mockFromUser.email
      },
      headers: { authorization: 'Bearer valid_token' }
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    await sendFriendRequest(mockReq, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Both emails are required"
    });
  });

  it('returns error if from user is unauthorized', async () => {
    const mockFromUser = {
        _id: new mongoose.Types.ObjectId(),
        name: 'From User',
        course: 'Computer Science',
        year: 2,
        semester: 1,
        email: 'from_user@test.com',
        password: 'password',
        timetable: 'base64string',
        profilePic: 'from_user.jpg',
        modules: [],
        friends: []        
    };

    const mockToUser = {
        _id: new mongoose.Types.ObjectId(),
        name: 'To User',
        course: 'Business Analytics',
        year: 2,
        semester: 1,
        email: 'to_user@test.com',
        password: 'password',
        timetable: 'base64string',
        profilePic: 'to_user.jpg',
        modules: [],
        friends: []
    };

    jwt.verify.mockReturnValue({ email: mockFromUser.email });
    User.findOne.mockResolvedValueOnce(null);

    const mockReq = {
      body: {
        fromEmail: mockFromUser.email,
        toEmail: mockToUser.email
      },
      headers: {}
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    await sendFriendRequest(mockReq, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: "Unauthorized"
    });
});

  it('returns error if toEmail is invalid', async () => {
    const mockFromUser = {
        _id: new mongoose.Types.ObjectId(),
        name: 'From User',
        course: 'Computer Science',
        year: 2,
        semester: 1,
        email: 'from_user@test.com',
        password: 'password',
        timetable: 'base64string',
        profilePic: 'from_user.jpg',
        modules: [],
        friends: []        
    };

    jwt.verify.mockReturnValue({ email: mockFromUser.email });
    User.findOne
      .mockResolvedValueOnce(mockFromUser)
      .mockResolvedValueOnce(mockFromUser)
      .mockResolvedValueOnce(null);

    const mockReq = {
      body: {
        fromEmail: mockFromUser.email,
        toEmail: 'invalid_to_user@test.com'
      },
      headers: { authorization: 'Bearer valid_token' }
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    await sendFriendRequest(mockReq, res);

    expect(jwt.verify).toHaveBeenCalledWith('valid_token', 'test_secret');

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      message: "User not found. Please check the email address"
    });
  });

  it('returns error if friend request is sent to self', async() => {
    const mockFromUser = {
        _id: new mongoose.Types.ObjectId(),
        name: 'From User',
        course: 'Computer Science',
        year: 2,
        semester: 1,
        email: 'from_user@test.com',
        password: 'password',
        timetable: 'base64string',
        profilePic: 'from_user.jpg',
        modules: [],
        friends: []        
    };

    jwt.verify.mockReturnValue({ email: mockFromUser.email });
    User.findOne
      .mockResolvedValueOnce(mockFromUser)
      .mockResolvedValueOnce(mockFromUser)
      .mockResolvedValueOnce(mockFromUser);

    const mockReq = {
      body: {
        fromEmail: mockFromUser.email,
        toEmail: mockFromUser.email
      },
      headers: { authorization: 'Bearer valid_token' }
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    await sendFriendRequest(mockReq, res);

    expect(jwt.verify).toHaveBeenCalledWith('valid_token', 'test_secret');

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Cannot send friend request to yourself"
    });
  });

  it('returns error if already friends', async () => {
    const mockToUser = {
        _id: new mongoose.Types.ObjectId(),
        name: 'To User',
        course: 'Business Analytics',
        year: 2,
        semester: 1,
        email: 'to_user@test.com',
        password: 'password',
        timetable: 'base64string',
        profilePic: 'to_user.jpg',
        modules: [],
        friends: []
    };
    const mockFromUser = {
        _id: new mongoose.Types.ObjectId(),
        name: 'From User',
        course: 'Computer Science',
        year: 2,
        semester: 1,
        email: 'from_user@test.com',
        password: 'password',
        timetable: 'base64string',
        profilePic: 'from_user.jpg',
        modules: [],
        friends: [mockToUser._id]        
    };

    jwt.verify.mockReturnValue({ email: mockFromUser.email });
    User.findOne
      .mockResolvedValueOnce(mockFromUser)
      .mockResolvedValueOnce(mockFromUser)
      .mockResolvedValueOnce(mockToUser);

    const mockReq = {
      body: {
        fromEmail: mockFromUser.email,
        toEmail: mockToUser.email
      },
      headers: { authorization: 'Bearer valid_token' }
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    await sendFriendRequest(mockReq, res);

    expect(jwt.verify).toHaveBeenCalledWith('valid_token', 'test_secret');

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "You are already friends with this user"
    });
  });

  it('returns error if friend request is already pending', async () => {
        const mockToUser = {
        _id: new mongoose.Types.ObjectId(),
        name: 'To User',
        course: 'Business Analytics',
        year: 2,
        semester: 1,
        email: 'to_user@test.com',
        password: 'password',
        timetable: 'base64string',
        profilePic: 'to_user.jpg',
        modules: [],
        friends: []
    };
    const mockFromUser = {
        _id: new mongoose.Types.ObjectId(),
        name: 'From User',
        course: 'Computer Science',
        year: 2,
        semester: 1,
        email: 'from_user@test.com',
        password: 'password',
        timetable: 'base64string',
        profilePic: 'from_user.jpg',
        modules: [],
        friends: []        
    };

    jwt.verify.mockReturnValue({ email: mockFromUser.email });
    User.findOne
      .mockResolvedValueOnce(mockFromUser)
      .mockResolvedValueOnce(mockFromUser)
      .mockResolvedValueOnce(mockToUser);
    FriendRequest.findOne.mockResolvedValue({
        from: mockFromUser._id,
        to: mockToUser._id,
        status: 'pending'
    });

    const mockReq = {
      body: {
        fromEmail: mockFromUser.email,
        toEmail: mockToUser.email
      },
      headers: { authorization: 'Bearer valid_token' }
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    await sendFriendRequest(mockReq, res);

    expect(jwt.verify).toHaveBeenCalledWith('valid_token', 'test_secret');
    expect(FriendRequest.findOne).toHaveBeenCalledWith({
      $or: [
        { from: mockFromUser._id, to: mockToUser._id },
        { from: mockToUser._id, to: mockFromUser._id }
      ],
      status: { $ne: 'rejected' }
    });

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Friend request already pending"
    });
  });

  it('returns error if friend request was previously rejected', async () => {
        const mockToUser = {
        _id: new mongoose.Types.ObjectId(),
        name: 'To User',
        course: 'Business Analytics',
        year: 2,
        semester: 1,
        email: 'to_user@test.com',
        password: 'password',
        timetable: 'base64string',
        profilePic: 'to_user.jpg',
        modules: [],
        friends: []
    };
    const mockFromUser = {
        _id: new mongoose.Types.ObjectId(),
        name: 'From User',
        course: 'Computer Science',
        year: 2,
        semester: 1,
        email: 'from_user@test.com',
        password: 'password',
        timetable: 'base64string',
        profilePic: 'from_user.jpg',
        modules: [],
        friends: []        
    };

    jwt.verify.mockReturnValue({ email: mockFromUser.email });
    User.findOne
      .mockResolvedValueOnce(mockFromUser)
      .mockResolvedValueOnce(mockFromUser)
      .mockResolvedValueOnce(mockToUser);
    FriendRequest.findOne.mockResolvedValue({
        from: mockFromUser._id,
        to: mockToUser._id,
        status: 'rejected'
    });

    const mockReq = {
      body: {
        fromEmail: mockFromUser.email,
        toEmail: mockToUser.email
      },
      headers: { authorization: 'Bearer valid_token' }
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    await sendFriendRequest(mockReq, res);

    expect(jwt.verify).toHaveBeenCalledWith('valid_token', 'test_secret');
    expect(FriendRequest.findOne).toHaveBeenCalledWith({
      $or: [
        { from: mockFromUser._id, to: mockToUser._id },
        { from: mockToUser._id, to: mockFromUser._id }
      ],
      status: { $ne: 'rejected' }
    });

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Friend request was previously handled"
    });
  });
});

describe('acceptFriendRequest', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('accepts friend request successfully', async () => {

  });
});