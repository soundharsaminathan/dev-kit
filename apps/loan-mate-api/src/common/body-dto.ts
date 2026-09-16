import { Body } from "@nestjs/common";

type DtoClass = abstract new (...args: never[]) => object;

/**
 * Same as `@Body()`, but the DTO constructor is a runtime argument.
 * That keeps the class as a value import so ValidationPipe can whitelist fields.
 */
export function BodyDto(dtoClass: DtoClass): ParameterDecorator {
  void dtoClass;
  return Body();
}
