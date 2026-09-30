const { emitToUser, emitToUsers } = require('../middleware/emit');


function broadcastToUser(userId, event, payload) {
  emitToUser(userId, event, payload);
}


async function broadcastToConversation(conversationId, event, payload, { excludeUserId } = {}) {
  
  const { ChatConversationMember } = require('../models');
  const members = await ChatConversationMember.findAll({
    where: { conversationId, leftAt: null },
    attributes: ['userId'],
  });
  const userIds = members.map((m) => m.userId).filter((id) => id !== excludeUserId);
  emitToUsers(userIds, event, payload);
}

module.exports = { broadcastToUser, broadcastToConversation };
