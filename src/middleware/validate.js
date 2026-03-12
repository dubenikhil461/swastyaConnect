/**
 * Joi validation middleware for Express.
 * On success: replaces target (body/query/params) with validated value.
 * On failure: 400 with { error, details }.
 */

function formatJoiError(error) {
  if (!error || !error.details) return 'Validation failed';
  return error.details.map((d) => d.message.replace(/"/g, '')).join('; ');
}

/**
 * @param {Joi.ObjectSchema} schema
 * @param {'body'|'query'|'params'} source
 */
export function validate(schema, source = 'body') {
  return (req, res, next) => {
    const value = req[source];
    const { error, value: validated } = schema.validate(value, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        message: formatJoiError(error),
        details: error.details.map((d) => ({
          path: d.path.join('.'),
          message: d.message,
        })),
      });
    }

    req[source] = validated;
    next();
  };
}

export const validateBody = (schema) => validate(schema, 'body');
export const validateQuery = (schema) => validate(schema, 'query');
export const validateParams = (schema) => validate(schema, 'params');
