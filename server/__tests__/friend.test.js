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
        friendIds: 'invalid' //friend IDs as string instead of array
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

    //missing toEmail in request body
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

  it('returns error when request is unauthorized', async () => {
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
      headers: {} //unauthorized request without token
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
        toEmail: 'invalid_to_user@test.com' //invalid toEmail
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
      .mockResolvedValueOnce(mockFromUser); //friend request sent to self

    const mockReq = {
      body: {
        fromEmail: mockFromUser.email,
        toEmail: mockFromUser.email //friend request sent to self
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
    const mockFromUserId = new mongoose.Types.ObjectId();
    const mockToUserId = new mongoose.Types.ObjectId();

    const mockToUser = {
        _id: mockToUserId,
        name: 'To User',
        course: 'Business Analytics',
        year: 2,
        semester: 1,
        email: 'to_user@test.com',
        password: 'password',
        timetable: 'base64string',
        profilePic: 'to_user.jpg',
        modules: [],
        friends: [mockFromUserId] //already friends
    };
    const mockFromUser = {
        _id: mockFromUserId,
        name: 'From User',
        course: 'Computer Science',
        year: 2,
        semester: 1,
        email: 'from_user@test.com',
        password: 'password',
        timetable: 'base64string',
        profilePic: 'from_user.jpg',
        modules: [],
        friends: [mockToUserId] //already friends      
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
        status: 'pending' //friend request already pending
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
        status: 'rejected' //friend request previously rejected
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
      friends: [],
      save: jest.fn().mockResolvedValue(true)
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
      friends: [],
      save: jest.fn().mockResolvedValue(true) 
    };
    User.findById
      .mockResolvedValueOnce(mockFromUser)
      .mockResolvedValueOnce(mockToUser);

    const mockFriendRequest = {
      _id: new mongoose.Types.ObjectId(),
      from: mockFromUser._id,
      to: mockToUser._id,
      status: 'pending',
      save: jest.fn().mockResolvedValue(true)
    };
    FriendRequest.findById.mockResolvedValue(mockFriendRequest);

    const mockReq = {
      body: {
        requestId: mockFriendRequest._id
      }
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    await acceptFriendRequest(mockReq, res);

    expect(FriendRequest.findById).toHaveBeenCalledWith(mockFriendRequest._id);
    expect(mockFromUser.friends).toContain(mockToUser._id);
    expect(mockToUser.friends).toContain(mockFromUser._id);
    expect(mockFriendRequest.status).toBe('accepted');

    expect(res.json).toHaveBeenCalledWith({
      message: "Friend request accepted successfully",
      updatedRequest: mockFriendRequest,
      fromUser: { _id: mockFromUser._id, name: mockFromUser.name },
      toUser: { _id: mockToUser._id, name: mockToUser.name }
    });
  });

  it('returns error when friend request cannot be found', async () => {
    FriendRequest.findById.mockResolvedValue(null); //friend request not found

    const mockReq = {
      body: {
        requestId: new mongoose.Types.ObjectId()
      }
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    await acceptFriendRequest(mockReq, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Friend request not found',
    });
  });

  it('returns error when friend request was already accepted', async () => {
    const mockToUserId = new mongoose.Types.ObjectId();
    const mockFromUserId = new mongoose.Types.ObjectId();
    
    const mockToUser = {
      _id: mockToUserId,
      name: 'To User',
      course: 'Business Analytics',
      year: 2,
      semester: 1,
      email: 'to_user@test.com',
      password: 'password',
      timetable: 'base64string',
      profilePic: 'to_user.jpg',
      modules: [],
      friends: [mockFromUserId], //already friends
      save: jest.fn().mockResolvedValue(true)
    };
    const mockFromUser = {
      _id: mockFromUserId,
      name: 'From User',
      course: 'Computer Science',
      year: 2,
      semester: 1,
      email: 'from_user@test.com',
      password: 'password',
      timetable: 'base64string',
      profilePic: 'from_user.jpg',
      modules: [],
      friends: [mockToUserId], //already friends
      save: jest.fn().mockResolvedValue(true) 
    };    

    const mockFriendRequest = {
      _id: new mongoose.Types.ObjectId(),
      from: mockFromUserId,
      to: mockToUserId,
      status: 'accepted', //friend request already accepted
      save: jest.fn().mockResolvedValue(true)
    };
    FriendRequest.findById.mockResolvedValue(mockFriendRequest);

    const mockReq = {
      body: {
        requestId: mockFriendRequest._id
      }
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    await acceptFriendRequest(mockReq, res);

    expect(FriendRequest.findById).toHaveBeenCalledWith(mockFriendRequest._id);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Friend request has already been processed'
    });
  });

  it('returns error when user cannot be found', async () => {
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
      friends: [],
      save: jest.fn().mockResolvedValue(true) 
    };
    User.findById
      .mockResolvedValueOnce(mockFromUser)
      .mockResolvedValueOnce(null); //to user not found

    const mockFriendRequest = {
      _id: new mongoose.Types.ObjectId(),
      from: mockFromUser._id,
      to: new mongoose.Types.ObjectId(),
      status: 'pending',
      save: jest.fn().mockResolvedValue(true)
    };
    FriendRequest.findById.mockResolvedValue(mockFriendRequest);

    const mockReq = {
      body: {
        requestId: mockFriendRequest._id
      }
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    await acceptFriendRequest(mockReq, res);

    expect(FriendRequest.findById).toHaveBeenCalledWith(mockFriendRequest._id);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      message: 'One or both users not found'
    });
  });
});

describe('rejectFriendRequest', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects friend request successfully', async () => {
    const mockFriendRequest = {
      _id: new mongoose.Types.ObjectId(),
      from: new mongoose.Types.ObjectId(),
      to: new mongoose.Types.ObjectId(),
      status: 'rejected'
    };
    FriendRequest.findByIdAndUpdate.mockResolvedValue(mockFriendRequest);

    const mockReq = {
      body: {
        requestId: mockFriendRequest._id
      }
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    await rejectFriendRequest(mockReq, res);

    expect(FriendRequest.findByIdAndUpdate).toHaveBeenCalledWith(mockFriendRequest._id, { status: 'rejected' }, { new: true });

    expect(res.json).toHaveBeenCalledWith({
      message: "Friend request rejected successfully",
      updatedRequest: mockFriendRequest
    });
  });

  it('returns error when friend request cannot be found', async () => {
    FriendRequest.findByIdAndUpdate.mockResolvedValue(null); //friend request not found

    const mockReq = {
      body: {
        requestId: new mongoose.Types.ObjectId()
      }
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    await rejectFriendRequest(mockReq, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Friend request not found'
    });
  });
});

describe('pendingFriendRequests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('retrieves pending friend requests successfully', async () => {
    const mockUserId = new mongoose.Types.ObjectId();

    const mockFriendRequests = [
      {
      _id: new mongoose.Types.ObjectId(),
      from: {
        name: 'Alice',
        email: 'alice@test.com',
        profilePic: 'alice.jpg'
      },
      to: mockUserId,
      status: 'pending'
      },
      {
      _id: new mongoose.Types.ObjectId(),
      from: {
        name: 'Bob',
        email: 'bob@test.com',
        profilePic: 'bob.jpg'
      },
      to: mockUserId,
      status: 'pending'
      }
    ];
    FriendRequest.find.mockReturnValue({
      populate: jest.fn().mockResolvedValue(mockFriendRequests)
    });

    const mockReq = {
      params: {
        userId: mockUserId
      }
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    await pendingFriendRequests(mockReq, res);

    expect(FriendRequest.find).toHaveBeenCalledWith({ to: mockUserId, status: 'pending' });
    expect(FriendRequest.find().populate).toHaveBeenCalledWith('from', 'name email profilePic');

    expect(res.json).toHaveBeenCalledWith({
      message: 'Pending friend requests retrieved',
      requests: mockFriendRequests
    });
  });
});

describe('deleteFriend', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('removes friend successfully', async () => {
    const mockUserId = new mongoose.Types.ObjectId();
    const mockFriendId = new mongoose.Types.ObjectId();

    const mockUser = {
      _id: mockUserId,
      name: 'Test User',
      course: 'Business Analytics',
      year: 2,
      semester: 1,
      email: 'test_user@test.com',
      password: 'password',
      timetable: 'base64string',
      profilePic: 'to_user.jpg',
      modules: [],
      friends: [mockFriendId, new mongoose.Types.ObjectId()],
      save: jest.fn().mockResolvedValue(true)
    };
    const mockFriend = {
      _id: mockFriendId,
      name: 'Friend User',
      course: 'Computer Science',
      year: 2,
      semester: 1,
      email: 'friend_user@test.com',
      password: 'password',
      timetable: 'base64string',
      profilePic: 'from_user.jpg',
      modules: [],
      friends: [mockUserId, new mongoose.Types.ObjectId()],
      save: jest.fn().mockResolvedValue(true)
    };

    jwt.verify.mockReturnValue({ email: mockUser.email });
    User.findOne.mockResolvedValue(mockUser);
    User.findById
      .mockResolvedValueOnce(mockUser)
      .mockResolvedValueOnce(mockFriend);
    FriendRequest.deleteMany.mockResolvedValue(true);

    const mockReq = {
      body: {
        userId: mockUserId,
        friendId: mockFriendId
      },
      headers: { authorization: 'Bearer valid_token' }
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    await deleteFriend(mockReq, res);

    expect(jwt.verify).toHaveBeenCalledWith('valid_token', 'test_secret');
    expect(mockUser.friends).not.toContain(mockFriendId);
    expect(mockFriend.friends).not.toContain(mockUserId);
    expect(FriendRequest.deleteMany).toHaveBeenCalledWith({
      $or: [
        { from: mockUserId, to: mockFriendId },
        { from: mockFriendId, to: mockUserId }
      ]
    });

    expect(res.json).toHaveBeenCalledWith({
      message: 'Friend removed successfully',
      updatedUser: {
        _id: mockUser._id,
        name: mockUser.name,
        friends: mockUser.friends
      }
    });  
  });

  it('returns error when request is unauthorized', async () => {
    const mockUserId = new mongoose.Types.ObjectId();
    const mockFriendId = new mongoose.Types.ObjectId();

    const mockUser = {
      _id: mockUserId,
      name: 'Test User',
      course: 'Business Analytics',
      year: 2,
      semester: 1,
      email: 'test_user@test.com',
      password: 'password',
      timetable: 'base64string',
      profilePic: 'to_user.jpg',
      modules: [],
      friends: [mockFriendId, new mongoose.Types.ObjectId()],
      save: jest.fn().mockResolvedValue(true)
    };

    jwt.verify.mockReturnValue({ email: mockUser.email });
    User.findOne.mockResolvedValue(null);

    const mockReq = {
      body: {
        userId: mockUserId,
        friendId: mockFriendId
      },
      headers: {} //unauthorized request without token
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    await deleteFriend(mockReq, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: "Unauthorized"
    });
  });

  it('returns error when user is unauthorized', async () => {
    const mockUser = {
      _id: new mongoose.Types.ObjectId(),
      name: 'Test User',
      course: 'Business Analytics',
      year: 2,
      semester: 1,
      email: 'test_user@test.com',
      password: 'password',
      timetable: 'base64string',
      profilePic: 'to_user.jpg',
      modules: [],
      friends: [],
      save: jest.fn().mockResolvedValue(true)
    };
    const mockRequestingUser = {
      _id: new mongoose.Types.ObjectId(),
      name: 'Requesting User',
      course: 'Computer Science',
      year: 2,
      semester: 1,
      email: 'requesting_user@test.com',
      password: 'password',
      timetable: 'base64string',
      profilePic: 'requesting_user.jpg',
      modules: [],
      friends: [],
      save: jest.fn().mockResolvedValue(true)
    };

    jwt.verify.mockReturnValue({ email: mockRequestingUser.email });
    User.findOne.mockResolvedValue(mockRequestingUser);

    const mockReq = {
      body: {
        userId: mockUser._id, //requesting user ID and user ID doesn't match
        friendId: new mongoose.Types.ObjectId()
      },
      headers: { authorization: 'Bearer valid_token' }
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    await deleteFriend(mockReq, res);

    expect(jwt.verify).toHaveBeenCalledWith('valid_token', 'test_secret');
    
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Not authorized to perform this action'
    });  
  });

  it('returns error when friend cannot be found', async () => {
    const mockUserId = new mongoose.Types.ObjectId();
    const mockFriendId = new mongoose.Types.ObjectId();

    const mockUser = {
      _id: mockUserId,
      name: 'Test User',
      course: 'Business Analytics',
      year: 2,
      semester: 1,
      email: 'test_user@test.com',
      password: 'password',
      timetable: 'base64string',
      profilePic: 'to_user.jpg',
      modules: [],
      friends: [mockFriendId, new mongoose.Types.ObjectId()],
      save: jest.fn().mockResolvedValue(true)
    };

    jwt.verify.mockReturnValue({ email: mockUser.email });
    User.findOne.mockResolvedValue(mockUser);
    User.findById
      .mockResolvedValueOnce(mockUser)
      .mockResolvedValueOnce(null);

    const mockReq = {
      body: {
        userId: mockUserId,
        friendId: mockFriendId
      },
      headers: { authorization: 'Bearer valid_token' }
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    await deleteFriend(mockReq, res);

    expect(jwt.verify).toHaveBeenCalledWith('valid_token', 'test_secret');

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      message: 'User or friend not found'
    });  
  });
});