import { ZodError } from 'zod'
import { ValidationError } from '../utils/errors.js'

/**
 * @param {import('zod').ZodSchema} schema
 * @param {'body' | 'query' | 'params'} source
 */
export function validate(schema, source = 'body') {
  /**
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   */
  return (req, _res, next) => {
    try {
      const parsed = schema.parse(req[source])
      if (source === 'query' || source === 'params') {
        // Express 5 exposes query/params via getters; mutate the object in place.
        const target = req[source]
        for (const key of Object.keys(target)) {
          delete target[key]
        }
        Object.assign(target, parsed)
      } else {
        req[source] = parsed
      }
      next()
    } catch (e) {
      if (e instanceof ZodError) {
        const msg = e.errors.map((x) => `${x.path.join('.')}: ${x.message}`).join('; ')
        return next(new ValidationError(msg))
      }
      next(e)
    }
  }
}
