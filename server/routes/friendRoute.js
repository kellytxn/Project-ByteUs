const express = require("express");
const router = express.Router();
const friendController = require("../controllers/friendController");

router.post("/getFriendsDetails", friendController.getFriendsDetails);
router.post("/sendFriendRequest", friendController.sendFriendRequest);
router.post("/acceptFriendRequest", friendController.acceptFriendRequest);
router.post("/rejectFriendRequest", friendController.rejectFriendRequest);
router.get(
  "/pendingFriendRequests/:userId",
  friendController.pendingFriendRequests
);
router.post("/deleteFriend", friendController.deleteFriend);

module.exports = router;
