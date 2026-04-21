import type { Genre, CreateGenreRequest } from "@get-down/shared";
import { z } from "zod";
import * as genresRepo from "../repository/genres.js";
import { ConflictError, NotFoundError } from "../errors.js";
import { parseOrBadRequest } from "../utils/parse.js";

export async function getGenres(): Promise<Genre[]> {
  const rows = await genresRepo.readGenres();
  return rows.map(r => ({ id: r.id, name: r.name }));
}

const CreateGenreSchema = z.object({
  name: z.string().min(1, "name is required").max(255),
});

export async function createGenre(body: unknown): Promise<Genre> {
  const input: CreateGenreRequest = parseOrBadRequest(CreateGenreSchema, body);
  const row = await genresRepo.createGenre(input.name.trim());
  return { id: row.id, name: row.name };
}

export async function deleteGenre(id: number): Promise<void> {
  const inUse = await genresRepo.isGenreInUse(id);
  if (inUse) throw new ConflictError("Genre is in use by one or more songs");
  const deleted = await genresRepo.deleteGenre(id);
  if (!deleted) throw new NotFoundError("Genre not found");
}

const BulkUpsertSchema = z.object({
  names: z.array(z.string().min(1).max(255)).min(1),
});

export async function bulkUpsertGenres(body: unknown): Promise<Genre[]> {
  const { names } = parseOrBadRequest(BulkUpsertSchema, body);
  const rows = await genresRepo.upsertGenresByName(names);
  return rows.map(r => ({ id: r.id, name: r.name }));
}
