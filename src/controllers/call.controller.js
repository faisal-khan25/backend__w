const asyncHandler = require('../utils/asyncHandler');
const callService = require('../services/call.service');

const getCallHistory = asyncHandler(async (req, res) => {
  const { page, pageSize } = req.query;
  const result = await callService.getCallHistory(req.user.id, { page, pageSize });
  res.status(200).json(result);
});

const getCall = asyncHandler(async (req, res) => {
  const result = await callService.getCall(req.params.callId, req.user.id);
  res.status(200).json(result);
});

const initiateCall = asyncHandler(async (req, res) => {
  const { targetUserId, callType, conversationId } = req.body;
  const result = await callService.initiateCall(req.user.id, {
    targetUserId,
    callType,
    conversationId,
  });
  res.status(201).json(result);
});

const acceptCall = asyncHandler(async (req, res) => {
  const result = await callService.acceptCall(req.params.callId, req.user.id);
  res.status(200).json(result);
});

const rejectCall = asyncHandler(async (req, res) => {
  const result = await callService.rejectCall(req.params.callId, req.user.id);
  res.status(200).json(result);
});

const cancelCall = asyncHandler(async (req, res) => {
  const result = await callService.cancelCall(req.params.callId, req.user.id);
  res.status(200).json(result);
});

const endCall = asyncHandler(async (req, res) => {
  const result = await callService.endCall(req.params.callId, req.user.id);
  res.status(200).json(result);
});

module.exports = {
  getCallHistory,
  getCall,
  initiateCall,
  acceptCall,
  rejectCall,
  cancelCall,
  endCall,
};
