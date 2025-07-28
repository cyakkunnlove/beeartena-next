// Mock for next/server
class NextRequest {
  constructor(url, options = {}) {
    this.url = url
    this.method = options.method || 'GET'
    this.headers = new Map(Object.entries(options.headers || {}))
    this.body = options.body
  }

  async json() {
    return JSON.parse(this.body)
  }

  async text() {
    return this.body
  }
}

class NextResponse extends Response {
  constructor(body, options = {}) {
    super(body, options)
  }

  static json(data, init = {}) {
    return new NextResponse(JSON.stringify(data), {
      ...init,
      headers: {
        'content-type': 'application/json',
        ...(init.headers || {}),
      },
    })
  }
}

module.exports = {
  NextRequest,
  NextResponse,
}
