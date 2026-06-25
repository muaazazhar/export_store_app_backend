import { BadRequestException } from '@nestjs/common';

export const PERSON_NAME_MIN_LENGTH = 2;
export const PERSON_NAME_MAX_LENGTH = 50;

type NameFieldLabel = 'firstName' | 'lastName';

type NameInput = {
  firstName?: unknown;
  first_name?: unknown;
  lastName?: unknown;
  last_name?: unknown;
};

export function pickNameInput(
  input: NameInput,
  field: NameFieldLabel,
): unknown {
  if (field === 'firstName') {
    return input.firstName ?? input.first_name;
  }
  return input.lastName ?? input.last_name;
}

export function parsePersonName(
  value: unknown,
  fieldLabel: NameFieldLabel,
  options: { required: boolean },
): string | null {
  if (value === undefined || value === null) {
    if (options.required) {
      throw new BadRequestException(`${fieldLabel} is required`);
    }
    return null;
  }

  const trimmed = String(value).trim();
  if (!trimmed) {
    if (options.required) {
      throw new BadRequestException(`${fieldLabel} is required`);
    }
    return null;
  }

  if (
    trimmed.length < PERSON_NAME_MIN_LENGTH ||
    trimmed.length > PERSON_NAME_MAX_LENGTH
  ) {
    throw new BadRequestException(
      `${fieldLabel} must be between ${PERSON_NAME_MIN_LENGTH} and ${PERSON_NAME_MAX_LENGTH} characters`,
    );
  }

  return trimmed;
}

export function parseRequiredPersonNames(input: NameInput): {
  firstName: string;
  lastName: string;
} {
  const firstName = parsePersonName(
    pickNameInput(input, 'firstName'),
    'firstName',
    { required: true },
  );
  const lastName = parsePersonName(
    pickNameInput(input, 'lastName'),
    'lastName',
    { required: true },
  );

  return { firstName: firstName!, lastName: lastName! };
}

export function parseOptionalPersonName(
  value: unknown,
  fieldLabel: NameFieldLabel,
): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  const parsed = parsePersonName(value, fieldLabel, { required: true });
  return parsed ?? undefined;
}

export function resolveGoogleProfileNames(
  givenName: string | undefined,
  familyName: string | undefined,
  username: string,
): { firstName: string; lastName: string } {
  let firstName = givenName?.trim() ?? '';
  let lastName = familyName?.trim() ?? '';

  if (
    firstName.length < PERSON_NAME_MIN_LENGTH ||
    firstName.length > PERSON_NAME_MAX_LENGTH
  ) {
    firstName = username.slice(0, PERSON_NAME_MAX_LENGTH);
    if (firstName.length < PERSON_NAME_MIN_LENGTH) {
      firstName = firstName.padEnd(PERSON_NAME_MIN_LENGTH, '0');
    }
  }

  if (lastName.length > PERSON_NAME_MAX_LENGTH) {
    lastName = lastName.slice(0, PERSON_NAME_MAX_LENGTH);
  }

  return { firstName, lastName };
}
