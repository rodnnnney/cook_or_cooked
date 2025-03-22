import os
import logging
from dotenv import load_dotenv
import cohere
from pylatexenc.latex2text import LatexNodes2Text

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("cohere_chat.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

def chat_with_cohere(prompt, system_prompt=None):
    """
    Function to interact with Cohere's API with logging
    """
    try:
        logger.info(f"Starting chat with prompt: '{prompt}'")
        
        load_dotenv()
        
        co_api_key = os.getenv("COHERE_API_KEY")
        if not co_api_key:
            logger.error("No Cohere API key found in environment variables")
            return "Error: API key not found"
        
        logger.debug("API key retrieved successfully")
        
        co = cohere.Client(co_api_key)
        logger.debug("Cohere client initialized")
        
        chat_params = {
            "model": "command-a-03-2025",
            "message": prompt
        }
        
        # Add system prompt if provided
        if system_prompt:
            chat_params["chat_history"] = []
            chat_params["preamble"] = system_prompt
            logger.debug("Added system prompt to request")
        
        # Make API call
        logger.info("Sending request to Cohere API")
        response = co.chat(**chat_params)
        
        logger.info("Received response from Cohere API")
        logger.debug(f"Raw response: {response}")
        
        return response
        
    except Exception as e:
        logger.error(f"Error in chat_with_cohere: {str(e)}", exc_info=True)
        return f"Error: {str(e)}"

def format_cohere_response(response):
    """Extract and format the text content from a Cohere API response"""
    if hasattr(response, 'text'):
        # For newer versions of the Cohere SDK
        return response.text
    elif hasattr(response, 'message'):
        # For some versions of the SDK
        return response.message
    elif isinstance(response, dict) and 'text' in response:
        # For response returned as dictionary
        return response['text']
    elif hasattr(response, 'generations') and len(response.generations) > 0:
        # For older versions of the SDK
        return response.generations[0].text
    else:
        # Try to extract from the chat_history
        try:
            if hasattr(response, 'chat_history') and response.chat_history:
                for message in reversed(response.chat_history):
                    if message.role == 'CHATBOT':
                        return message.message
        except:
            pass
        
        # If all else fails, return the string representation
        return str(response)

# Define the math system prompt
MATH_SYSTEM_PROMPT = """
You are MathSolveAI, an advanced mathematical assistant with expertise in algebra and calculus. Your purpose is to solve mathematical problems step-by-step, providing clear explanations that help users understand the solution process.

## Expertise Areas:
- Algebra: Solving equations, inequalities, systems of equations, factoring, simplification, exponents, logarithms, and polynomial operations
- Calculus: Differentiation techniques with special focus on integration by parts, product rule, chain rule, implicit differentiation, related rates, and optimization problems

## Response Format:
1. First, restate the problem to confirm understanding
2. Identify the most appropriate solution method
3. Break down the solution into clear, logical steps
4. Include mathematical notation using LaTeX formatting
5. Highlight key insights or patterns in the solution
6. If multiple approaches exist, mention alternative methods
7. Provide a final answer clearly labeled

## Guidelines:
- Always show complete mathematical workings
- Explain your reasoning at each step
- Use proper mathematical notation
- For complex problems, start with simpler cases or examples if helpful
- When using integration by parts, clearly identify u and dv, and explain the choice
- Verify final answers through substitution or other checks where appropriate
- If a problem appears ambiguous, request clarification rather than making assumptions

The user will send you mathematical problems to solve. Treat each user message as a separate math question or problem that requires your solution. If their message isn't a math problem, politely guide them to ask a mathematical question.
"""

# Example usage
if __name__ == "__main__":
    # Your math question goes here
    math_question = "Solve for x in the following equation: 2x² - 5x + 3 = 0. Show your work and explain your reasoning"
    
    # Call the function with both the question and system prompt
    response = chat_with_cohere(math_question, MATH_SYSTEM_PROMPT)
    
    # Format and print just the response text
    formatted_response = format_cohere_response(response)
    print(formatted_response)

    # Example of using pylatexenc to convert LaTeX to plain text
    latex_string = "\\frac{3}{2} \\quad \\text{or} \\quad x = 1"
    plain_text = LatexNodes2Text().latex_to_text(latex_string)
    print(plain_text)