jest.mock('node-fetch');

const fetch = require('node-fetch');
process.env.GEMINI_API_KEY = 'test_api_key';
const {
  generateGemini
} = require('../controllers/chatbotController');

describe('generateGemini', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('generates response successfully', async () => {
    const mockResponse = {
      candidates: [
        {
          content: {
            parts: [{ text: 'Test response' }]
          }
        }
      ]
    };

    fetch.mockResolvedValue({
      json: jest.fn().mockResolvedValue(mockResponse)
    });

    const mockReq = {
      body: { prompt: 'Test prompt' }
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    await generateGemini(mockReq, res);

    expect(fetch).toHaveBeenCalledWith(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=test_api_key`,
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: 'Test prompt' }] }] })
      })
    );

    expect(res.json).toHaveBeenCalledWith({ response: 'Test response' });
  });

  it("returns 'no response' when prompt has no reply", async () => {
    const mockResponse = {
      candidates: [
        {
          content: {}
        }
      ]
    };

    fetch.mockResolvedValue({
      json: jest.fn().mockResolvedValue(mockResponse)
    });

    const mockReq = {
      body: { prompt: 'Test prompt' }
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    await generateGemini(mockReq, res);

    expect(fetch).toHaveBeenCalledWith(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=test_api_key`,
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: 'Test prompt' }] }] })
      })
    );
    
    expect(res.json).toHaveBeenCalledWith({ response: 'No response' });
  });
});