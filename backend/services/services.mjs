import models from "../models/services.mjs";

export function getServices(rawServices) {
  return rawServices.map((s) => new models.Service(s));
}

export default { getServices };
