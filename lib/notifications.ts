type AppointmentNotice = {
  reference: string;
  serviceName: string;
  date: string;
  time: string;
  name: string;
  email: string;
  phone: string;
  manageUrl: string;
};

type NoticeKind = "booked" | "reminder" | "cancelled" | "confirmed";

function configuration() {
  const values = process.env;
  return {
    resendKey: values.RESEND_API_KEY ?? "",
    fromEmail: values.NOTIFICATION_FROM_EMAIL ?? "",
    twilioSid: values.TWILIO_ACCOUNT_SID ?? "",
    twilioToken: values.TWILIO_AUTH_TOKEN ?? "",
    twilioFrom: values.TWILIO_FROM_NUMBER ?? "",
  };
}

function content(kind: NoticeKind, appointment: AppointmentNotice) {
  const when = `${appointment.date} at ${appointment.time}`;
  if (kind === "booked") {
    return {
      subject: `NailsBySnig appointment confirmed — ${appointment.reference}`,
      text: `Hi ${appointment.name}, your ${appointment.serviceName} appointment is confirmed for ${when}. Manage or cancel: ${appointment.manageUrl}`,
    };
  }
  if (kind === "reminder") {
    return {
      subject: `Tomorrow’s NailsBySnig appointment`,
      text: `Hi ${appointment.name}, reminder: your ${appointment.serviceName} appointment is tomorrow, ${when}. Manage or cancel: ${appointment.manageUrl}`,
    };
  }
  if (kind === "confirmed") {
    return {
      subject: `NailsBySnig appointment confirmed`,
      text: `Thanks, ${appointment.name}. Your ${appointment.serviceName} appointment for ${when} is confirmed. Manage or cancel: ${appointment.manageUrl}`,
    };
  }
  return {
    subject: `NailsBySnig appointment cancelled`,
    text: `Hi ${appointment.name}, your ${appointment.serviceName} appointment for ${when} has been cancelled. Reference: ${appointment.reference}`,
  };
}

async function sendEmail(to: string, subject: string, text: string) {
  const config = configuration();
  if (!to || !config.resendKey || !config.fromEmail) return false;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${config.resendKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ from: config.fromEmail, to: [to], subject, text }),
  });
  return response.ok;
}

async function sendSms(to: string, text: string) {
  const config = configuration();
  if (!to || !config.twilioSid || !config.twilioToken || !config.twilioFrom) return false;
  const body = new URLSearchParams({ To: to, From: config.twilioFrom, Body: text });
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${config.twilioSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        authorization: `Basic ${btoa(`${config.twilioSid}:${config.twilioToken}`)}`,
        "content-type": "application/x-www-form-urlencoded",
      },
      body,
    },
  );
  return response.ok;
}

export async function sendAppointmentNotice(kind: NoticeKind, appointment: AppointmentNotice) {
  const message = content(kind, appointment);
  const results = await Promise.allSettled([
    sendEmail(appointment.email, message.subject, message.text),
    sendSms(appointment.phone, message.text),
  ]);
  return results.some((result) => result.status === "fulfilled" && result.value);
}
