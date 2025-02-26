import { csvToEnquiry } from "./enquiries.mjs";

// dateUtils.js
export function isSameDay(date1, date2) {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

test("csvToEnquiry", () => {
  const rawCSV = {
    Timestamp: "26/08/2024 19:58:33",
    "First Name": "Garry",
    "Last Name": "Hall",
    "Partner's Name (Full name)": "ted",
    Email: "garrymhall@gmail.com",
    Phone: "07954577999",
    "Event Date (optional)": "26/12/2024",
    "Venue Location (optional)": "Perthshire",
    "Which services are you interested in?":
      "Live Band (3/5/7 piece), Wedding Film, abc",
  };
  const services = [
    { id: 1, name: "Live Band (3/5/7 piece)" },
    { id: 2, name: "Wedding Film" },
    { id: 3, name: "Photography" },
    { id: 4, name: "Singing Waiting" },
    { id: 5, name: "Bagpipes" },
    { id: 6, name: "Acoustic Duo" },
    { id: 7, name: "Karaoke/Bandeoke" },
    { id: 8, name: "Saxophone Solo" },
    { id: 9, name: "DJ" },
    { id: 10, name: "Ceilidh" },
  ];

  let enquiry = csvToEnquiry(rawCSV, services);

  expect(isSameDay(enquiry.createdAt, new Date(2024, 7, 26))).toBe(true);
  expect(enquiry.firstName).toBe("Garry");
  expect(enquiry.lastName).toBe("Hall");
  expect(enquiry.partnersName).toBe("ted");
  expect(enquiry.email).toBe("garrymhall@gmail.com");
  console.log(enquiry, "garrymhall@gmail.com");
  expect(enquiry.phone).toBe("07954577999");
  expect(isSameDay(enquiry.eventDate, new Date(2024, 11, 26))).toBe(true);
  expect(enquiry.venueLocation).toBe("Perthshire");
  expect(enquiry.services).toEqual(["Live Band (3/5/7 piece)", "Wedding Film"]);
  expect(enquiry.otherServices).toEqual(["abc"]);
  expect(enquiry.message).toBeFalsy();
});
// test("enquiryToClickableLink", () => {
//   enquiryToClickableLink();
// });
