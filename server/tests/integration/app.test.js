import { describe, it, expect } from 'vitest'
import request from 'supertest'
import app from '../../src/app.js'

describe('HTTP API (integration)', () => {
  it('GET /health returns ok', async () => {
    const res = await request(app).get('/health')
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })

  it('POST /login validates body (Zod)', async () => {
    const res = await request(app).post('/login').send({ email: 'bad', password: 'x' })
    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
  })

  it('GET /student/dashboard without token returns 401', async () => {
    const res = await request(app).get('/student/dashboard')
    expect(res.status).toBe(401)
  })

  it('GET /teacher/leave-requests without token returns 401', async () => {
    const res = await request(app).get('/teacher/leave-requests')
    expect(res.status).toBe(401)
  })
})
