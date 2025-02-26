class Service {
  constructor(id, name) {
    Object.assign(this, { id, name });
  }
}

export function newService(id, name) {
  return new Service(id, name);
}

export default { Service, newService };
