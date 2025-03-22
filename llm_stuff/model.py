from openai import OpenAI
import base64

from dotenv import load_dotenv
import os
import getpass

from pydantic import BaseModel
from typing import Literal, Union, Tuple

load_dotenv()
if not os.environ.get("OPENAI_API_KEY"):
  os.environ["OPENAI_API_KEY"] = getpass.getpass("Enter API key for OpenAI: ")

image_reader_prompt= """
You are given an image with questions on it. You are to read the image and return a string that contains the contents of the image in a way that is easy to read and understand, while inluding all the important information in the image about each and every question. Focus on the questions and put less emphasis on the other information.
"""

question_splitter_prompt = """
You are given a string that contains one or multiple questions. You are to split the text into the one or multiple questions.
Steps:
1. Read the text
2. Identify the questions
3. Split the text into the one or multiple questions
4. Return the questions in a list

For each question use this format:
{
    "question summary": question summary string,
    "full question": full question string
}

The question summary string should be a very short summary of the question.
The full question string should be the full question. MAKE SURE THE THE FULL QUESTION (EVERYTHING) IS IN THE FULL QUESTION STRING. DO NOT LOSE ANY INFORMATION FROM THE QUESTION. THIS STRING SHOULD BE DIRECTLY USABLE TO SOLVE THE QUESTION.

These question(s) will be put together into a list of questions.
"""

class Question(BaseModel):
    question_summary: str
    full_question: str
class AllQuestions(BaseModel):
    questions: list[Question]


def run_gpt_with_image(image_path, text_prompt, temperature: float = 0, model="gpt-4o") -> str:
    def encode_image(image_path):
        with open(image_path, "rb") as image_file:
            return base64.b64encode(image_file.read()).decode("utf-8")
    base64_image = encode_image(image_path)

    open_ai_key = os.environ["OPENAI_API_KEY"]
    client = OpenAI(api_key=open_ai_key)
    response = client.responses.create(
        model=model,
        input=[
            {
                "role": "user",
                "content": [
                    { "type": "input_text", "text": text_prompt },
                    {
                        "type": "input_image",
                        "image_url": f"data:image/jpeg;base64,{base64_image}",
                    },
                ],
            }
        ],
    )

    return response.output_text

def run_gpt_with_formatted_output(system_prompt, user_prompt, temperature: float = 0, model="gpt-4o-mini") -> list[Question]:
    open_ai_key = os.environ["OPENAI_API_KEY"]
    client = OpenAI(api_key=open_ai_key)

    response = client.beta.chat.completions.parse(
      model=model,
      messages=[
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
      ],
      temperature=temperature,
      response_format=AllQuestions
    )

    resp = response.choices[0].message.parsed
    resp_formatted = resp.model_dump() # resp_formatted should be a dict

    return resp_formatted["questions"]





if __name__ == "__main__":
    # text = "What is the capital of France? What is the capital of Germany? What is the capital of Italy?"
    # questions = run_gpt_with_formatted_output(question_splitter_prompt, text)

    # print(questions)
    
    image_path = "IMG_2075.png"
    questions_text = run_gpt_with_image(image_path, image_reader_prompt)
    print(questions_text)

    questions_formatted = run_gpt_with_formatted_output(question_splitter_prompt, questions_text)
    print(questions_formatted)
