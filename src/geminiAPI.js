const API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const PRIMARY_MODEL = 'llama-3.3-70b-versatile';
const FALLBACK_MODEL = 'llama-3.1-8b-instant';

/**
 * Call Groq API with retry logic and model fallback
 * @param {string} prompt - The prompt to send
 * @param {number} maxRetries - Maximum number of retries (default: 3)
 * @returns {Promise<string>} The response text
 */
async function callGroqAPI(prompt, maxRetries = 3) {
  if (!API_KEY) {
    throw new Error('VITE_GROQ_API_KEY is not set in environment variables');
  }

  // Try primary model first
  let modelsToTry = [PRIMARY_MODEL, FALLBACK_MODEL];
  
  for (const model of modelsToTry) {
    console.log(`[Groq API] Attempting to use model: ${model}`);
    
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(GROQ_API_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: model,
            messages: [
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: 0.7
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const statusText = response.statusText || 'Unknown error';
          const errorMessage = errorData.error?.message || errorData.message || statusText;
          
          // Check if model is decommissioned - try fallback
          if (response.status === 400 && (
            errorMessage.includes('decommissioned') || 
            errorMessage.includes('no longer supported') ||
            errorMessage.includes('not found')
          )) {
            console.log(`[Groq API] Model ${model} is not available: ${errorMessage}`);
            if (model === PRIMARY_MODEL && modelsToTry.length > 1) {
              // Try fallback model
              break; // Exit retry loop, will try next model
            }
            throw new Error(`Groq API error (${response.status}): ${errorMessage}`);
          }
          
          // Don't retry on 4xx errors (client errors) except 429 (rate limit)
          if (response.status >= 400 && response.status < 500 && response.status !== 429) {
            throw new Error(`Groq API error (${response.status}): ${errorMessage}`);
          }
          
          // Retry on 5xx errors and 429 (rate limit)
          if (response.status >= 500 || response.status === 429) {
            lastError = new Error(`Groq API error (${response.status}): ${errorMessage}. Attempt ${attempt}/${maxRetries}`);
            if (attempt < maxRetries) {
              // Exponential backoff: wait 1s, 2s, 4s
              await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000));
              continue;
            }
            throw lastError;
          }
          
          throw new Error(`Groq API error (${response.status}): ${errorMessage}`);
        }

        const data = await response.json();
        
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
          throw new Error('Invalid response format from Groq API');
        }

        console.log(`[Groq API] Successfully used model: ${model}`);
        return data.choices[0].message.content || '';
      } catch (error) {
        lastError = error;
        
        // If it's not a retryable error, check if we should try fallback
        if (error.message && (
          error.message.includes('VITE_GROQ_API_KEY') ||
          (error.message.includes('Groq API error') && 
           !error.message.includes('429') && 
           !error.message.includes('5') &&
           !error.message.includes('decommissioned') &&
           !error.message.includes('no longer supported') &&
           !error.message.includes('not found'))
        )) {
          // If this is the primary model and error suggests model issue, try fallback
          if (model === PRIMARY_MODEL && modelsToTry.length > 1) {
            console.log(`[Groq API] Primary model failed, trying fallback...`);
            break; // Exit retry loop, will try fallback model
          }
          throw error;
        }
        
        // Retry on network errors and server errors
        if (attempt < maxRetries) {
          // Exponential backoff: wait 1s, 2s, 4s
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000));
          continue;
        }
      }
    }
    
    // If we got here and have a lastError, and this is the last model, throw it
    if (lastError && model === modelsToTry[modelsToTry.length - 1]) {
      throw lastError;
    }
  }
  
  throw new Error('Failed to call Groq API with all available models');
}

/**
 * Extract JSON from response text (handles markdown code blocks)
 * @param {string} text - The response text
 * @returns {string} Extracted JSON string
 */
function extractJSON(text) {
  let jsonText = text.trim();
  
  // Remove markdown code blocks if present
  if (jsonText.startsWith('```json')) {
    jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  
  return jsonText;
}

/**
 * Analyze a book using Groq API
 * @param {string} bookTitle - The title of the book
 * @param {string} bookAuthor - The author of the book
 * @returns {Promise<Object>} Parsed JSON response with themes and quotes
 */
export async function analyzeBook(bookTitle, bookAuthor) {
  try {
    // Build the prompt
    const prompt = `Analyze the book "${bookTitle}" by ${bookAuthor}. Return JSON with: themes array (max 5 from this list: Identity & Self, Emotional Health, Love & Relationships, Power & Strategy, Existentialism, Science & Universe, War & Conflict, Time & Memory, Morality & Ethics, Human Nature, Dystopia) and for each theme provide 3 memorable quotes from the book.

Return ONLY valid JSON in this format:
{
  "themes": [
    {
      "theme": "theme name",
      "quotes": ["quote 1", "quote 2", "quote 3"]
    }
  ]
}`;

    // Call Groq API
    const responseText = await callGroqAPI(prompt);
    
    // Extract and parse JSON
    const jsonText = extractJSON(responseText);
    const parsed = JSON.parse(jsonText);

    // Validate response structure
    if (!parsed.themes || !Array.isArray(parsed.themes)) {
      throw new Error('Invalid response format: themes array not found');
    }

    return parsed;
  } catch (error) {
    console.error('Error analyzing book with Groq API:', error);
    
    // Re-throw with more context
    if (error.message.includes('VITE_GROQ_API_KEY')) {
      throw new Error('Groq API key not configured. Please set VITE_GROQ_API_KEY in your .env file.');
    } else if (error.message.includes('JSON') || error.message.includes('parse')) {
      throw new Error(`Failed to parse Groq API response: ${error.message}`);
    } else if (error.message.includes('quota') || error.message.includes('429') || error.message.includes('rate limit')) {
      throw new Error('Groq API rate limit exceeded. Please try again later.');
    } else {
      throw new Error(`Groq API error: ${error.message}`);
    }
  }
}

/**
 * Generate AI insights for a book
 * @param {string} bookTitle - The title of the book
 * @param {string} bookAuthor - The author of the book
 * @param {Array} books - Array of all books in user's library
 * @returns {Promise<Object>} Parsed JSON response with insights
 */
export async function generateInsights(bookTitle, bookAuthor, books = []) {
  try {
    // Extract all read book titles from the books array
    const readBookTitles = books
      .filter(book => book.title && book.title.trim() !== '')
      .map(book => book.title.trim());
    
    const readBooksList = readBookTitles.length > 0
      ? readBookTitles.join(', ')
      : 'No books read yet';

    // Build the prompt
    const prompt = `Analyze "${bookTitle}" by ${bookAuthor}.

User has already read: ${readBooksList}

Suggest 5 books similar to "${bookTitle}" that are:
- NOT in the list above
- Similar themes/style
- Highly rated
- Different authors preferred

Return ONLY valid JSON in this format (array of book objects):
[
  {
    "title": "Book title",
    "author": "Author name"
  },
  {
    "title": "Book title",
    "author": "Author name"
  }
]

Important: 
- Return exactly 5 book suggestions
- Do NOT suggest any books from the "already read" list
- Focus on books with similar themes and style
- Prefer different authors when possible`;

    // Call Groq API
    const responseText = await callGroqAPI(prompt);
    
    // Extract and parse JSON
    const jsonText = extractJSON(responseText);
    const parsed = JSON.parse(jsonText);

    // Validate response structure - should be an array
    if (!Array.isArray(parsed)) {
      throw new Error('Invalid response format: expected array of book suggestions');
    }

    // Validate each suggestion has title and author
    const validSuggestions = parsed.filter(book => 
      book && book.title && book.author
    );

    if (validSuggestions.length === 0) {
      throw new Error('No valid book suggestions returned');
    }

    return {
      suggestions: validSuggestions.slice(0, 5) // Ensure max 5 suggestions
    };
  } catch (error) {
    console.error('Error generating insights with Groq API:', error);
    
    // Re-throw with more context
    if (error.message.includes('VITE_GROQ_API_KEY')) {
      throw new Error('Groq API key not configured. Please set VITE_GROQ_API_KEY in your .env file.');
    } else if (error.message.includes('JSON') || error.message.includes('parse')) {
      throw new Error(`Failed to parse Groq API response: ${error.message}`);
    } else if (error.message.includes('quota') || error.message.includes('429') || error.message.includes('rate limit')) {
      throw new Error('Groq API rate limit exceeded. Please try again later.');
    } else {
      throw new Error(`Groq API error: ${error.message}`);
    }
  }
}

export default { analyzeBook, generateInsights };
