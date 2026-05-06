const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { protect } = require('../../middleware/auth');
const { authorize } = require('../../middleware/role');

router.use(protect);

router.post('/', controller.createAppointment);
router.get('/', controller.getAppointments);
router.put('/:id', controller.updateAppointment);
router.delete('/:id', authorize('ADMIN'), controller.deleteAppointment);

module.exports = router;
