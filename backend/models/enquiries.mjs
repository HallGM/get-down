export class Enquiry {
  constructor(obj) {
    this.id = obj.id || "";
    this.createdAt = obj.createdAt;
    this.firstName = obj.firstName;
    this.lastName = obj.lastName;
    this.partnersName = obj.partnersName;
    this.email = obj.email;
    this.phone = obj.phone;
    this.eventDate = obj.eventDate;
    this.venueLocation = obj.venueLocation;
    this.services = obj.services;
    this.otherServices = obj.otherServices;
    this.message = obj.message;
    this.email = obj.email.trim().replace(" ", "");
  }
}

export function newEnquiryWithId(
  id,
  createdAt,
  firstName,
  lastName,
  partnersName,
  email,
  phone,
  eventDate,
  venueLocation,
  services,
  otherServices,
  message
) {
  return new Enquiry({
    id,
    createdAt,
    firstName,
    lastName,
    partnersName,
    email,
    phone,
    eventDate,
    venueLocation,
    services,
    otherServices,
    message,
  });
}

// test
export function newEnquiry(
  createdAt,
  firstName,
  lastName,
  partnersName,
  email,
  phone,
  eventDate,
  venueLocation,
  services,
  otherServices,
  message
) {
  return new Enquiry({
    createdAt,
    firstName,
    lastName,
    partnersName,
    email,
    phone,
    eventDate,
    venueLocation,
    services,
    otherServices,
    message,
  });
}
export default { newEnquiry, Enquiry, newEnquiryWithId };
