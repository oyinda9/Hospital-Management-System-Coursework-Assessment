import { catchAsyncErrors } from "../middlewares/catchAsyncErrors.js";
import ErrorHandler from "../middlewares/errorMiddleware.js";
import { Appointment } from "../models/appointmentSchema.js";
import { User } from "../models/userSchema.js";
// Fix for D5: the updateAppointmentStatus function was rewritten to only accept the "status" field from the request body, and to reject any invalid status values.
export const postAppointment = catchAsyncErrors(async (req, res, next) => {
  const {
    firstName,
    lastName,
    email,
    phone,
    aadhar,
    dob,
    gender,
    appointment_date,
    department,
    doctor_firstName,
    doctor_lastName,
    hasVisited,
    address,
  } = req.body;

  if (
    !firstName ||
    !lastName ||
    !email ||
    !phone ||
    !aadhar ||
    !dob ||
    !gender ||
    !appointment_date ||
    !department ||
    !doctor_firstName ||
    !doctor_lastName ||
    !address
  ) {
    return next(new ErrorHandler("Please Fill Full Form!", 400));
  }
  // Fix for D14: validate the appointment date before anything is saved.
  // Before, any text (for example "not-a-date") or a date in the past was accepted.
  const requestedDate = new Date(appointment_date);
  if (Number.isNaN(requestedDate.getTime())) {
    return next(new ErrorHandler("Appointment date is not a valid date!", 400));
  }
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0); // today is still allowed, only earlier days are refused
  if (requestedDate < startOfToday) {
    return next(
      new ErrorHandler("Appointment date cannot be in the past!", 400),
    );
  }
  const isConflict = await User.find({
    firstName: doctor_firstName,
    lastName: doctor_lastName,
    role: "Doctor",
    doctrDptmnt: department,
  });

  if (isConflict.length === 0) {
    return next(new ErrorHandler("Doctor not found!", 404));
  }

  if (isConflict.length > 1) {
    return next(
      new ErrorHandler(
        "Doctors conflict! Please contact through email or phone.",
        404,
      ),
    );
  }

  const doctorId = isConflict[0]._id;
  const patientId = req.user._id;

  const appointment = await Appointment.create({
    firstName,
    lastName,
    email,
    phone,
    aadhar,
    dob,
    gender,
    appointment_date,
    department,
    doctor: {
      firstName: doctor_firstName,
      lastName: doctor_lastName,
    },
    hasVisited,
    address,
    doctorId,
    patientId,
  });
  res.status(200).json({
    success: true,
    message: "Appointment Sent Successfully!",
    appointment,
  });
});

export const getAllAppointments = catchAsyncErrors(async (req, res, next) => {
  const appointments = await Appointment.find();
  res.status(200).json({
    success: true,
    appointments,
  });
});

// Fix for D5: the updateAppointmentStatus function was rewritten to only accept the "status" field from the request body, and to reject any invalid status values.
// export const updateAppointmentStatus = catchAsyncErrors(async (req,res,next)=>{
//     const {id} = req.params;

//        let appointment = await Appointment.findById(id)
//     if(!appointment){
//        return next(new ErrorHandler("Appointment not found!", 404))
//     }
//     appointment = await Appointment.findByIdAndUpdate(id, req.body, {
//         new : true,
//         runValidators: true,
//         useFindAndModify: false
//     } )
//     res.status(200).json({
//         success: true,
//         message: "Appointment Status Updated!",
//         appointment
//     })
// })

export const updateAppointmentStatus = catchAsyncErrors(
  async (req, res, next) => {
    const { id } = req.params;

    // Fix for D5: only the "status" field is read from the request body.
    // Before, the whole req.body was written to the database, so an admin request
    // could also overwrite patient, doctor or date fields (mass assignment).
    const { status } = req.body;

    // Fix for D5: reject any value that is not one of the three allowed statuses.
    if (!["Pending", "Accepted", "Rejected"].includes(status)) {
      return next(
        new ErrorHandler("Status must be Pending, Accepted or Rejected!", 400),
      );
    }

    let appointment = await Appointment.findById(id);
    if (!appointment) {
      return next(new ErrorHandler("Appointment not found!", 404));
    }

    appointment = await Appointment.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true },
    );

    res.status(200).json({
      success: true,
      message: "Appointment Status Updated!",
      appointment,
    });
  },
);

export const deleteAppointment = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;
  let appointment = await Appointment.findById(id);
  if (!appointment) {
    return next(new ErrorHandler("Appointment not found!", 404));
  }

  await appointment.deleteOne();
  res.status(200).json({
    success: true,
    message: "Appointment Deleted!",
  });
});
