import { run_query, shutdown } from "../db/init.js";
import * as repoServices from "../repository/services.js";

const queries = [
  `CREATE TABLE IF NOT EXISTS services (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255)
  );`,
  `DROP TABLE IF EXISTS enquiries CASCADE;`,
  `CREATE TABLE IF NOT EXISTS enquiries (
    id SERIAL PRIMARY KEY,
    created_at DATE,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    partner_name VARCHAR(255),
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(255),
    event_date DATE,
    venue_location VARCHAR(255),
    other_services VARCHAR(255)[],
    message TEXT
  );`,
  `DROP TABLE IF EXISTS enquiries_services;`,
  `CREATE TABLE IF NOT EXISTS enquiries_services (
    id SERIAL PRIMARY KEY,
    service_id INT,
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
    enquiry_id INT,
    FOREIGN KEY (enquiry_id) REFERENCES enquiries(id) ON DELETE CASCADE
  );`,
];

export async function buildDB(): Promise<void> {
  for (const query of queries) {
    console.log(await run_query({ text: query }));
  }

  const services = [
    "Live Band (3/5/7 piece)",
    "Wedding Film",
    "Photography",
    "Singing Waiting",
    "Bagpipes",
    "Acoustic Duo",
    "Karaoke/Bandeoke",
    "Saxophone Solo",
    "DJ",
    "Ceilidh",
  ];

  for (const s of services) {
    await repoServices.createService(s);
  }
}

await buildDB();
shutdown();
