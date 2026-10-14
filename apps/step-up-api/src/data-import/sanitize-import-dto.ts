import { sanitizeImportValue } from "../common/decode-import-text";
import type { ImportStudioDataDto } from "./dto/import-studio-data.dto";

export function sanitizeImportStudioDataDto(
  dto: ImportStudioDataDto,
): ImportStudioDataDto {
  return sanitizeImportValue(dto) as ImportStudioDataDto;
}
