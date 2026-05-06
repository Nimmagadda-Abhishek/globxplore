const Appointment = require('./model');

exports.createAppointment = async (req, res, next) => {
  try {
    const appointment = await Appointment.create({
      ...req.body,
      agent: req.user.id
    });
    res.status(201).json({ success: true, data: appointment });
  } catch (error) {
    next(error);
  }
};

exports.getAppointments = async (req, res, next) => {
  try {
    const query = req.user.role === 'ADMIN' ? {} : { agent: req.user.id };
    const appointments = await Appointment.find(query).populate('client', 'name email phone');
    res.status(200).json({ success: true, data: appointments });
  } catch (error) {
    next(error);
  }
};

exports.updateAppointment = async (req, res, next) => {
  try {
    const appointment = await Appointment.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });
    res.status(200).json({ success: true, data: appointment });
  } catch (error) {
    next(error);
  }
};

exports.deleteAppointment = async (req, res, next) => {
  try {
    const appointment = await Appointment.findByIdAndDelete(req.params.id);
    if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });
    res.status(200).json({ success: true, message: 'Appointment deleted' });
  } catch (error) {
    next(error);
  }
};
