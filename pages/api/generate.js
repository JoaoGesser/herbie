import { Configuration, OpenAIApi } from "openai";

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

export default async function (req, res) {
  if (!configuration.apiKey) {
    res.status(500).json({
      error: {
        message: "OpenAI API key not configured, please follow instructions in README.md",
      }
    });
    return;
  }
  
  const animal = req.body.animal || '';
  if (animal.trim().length === 0) {
    res.status(400).json({
      error: {
        message: "Please enter a valid animal",
      }
    });
    return;
  }

  try {
    const completion = await openai.createCompletion({
      model: "davinci:ft-personal-2023-03-25-21-49-18",
      prompt: generatePrompt(animal),
      stop: "\n",
      //Importante para esse cenario a temperatura ser 0 para ser mais acertivo e menos criativo
      temperature: 0.0,
    });
    res.status(200).json({ result: completion.data.choices[0].text });
  } catch(error) {
    // Consider adjusting the error handling logic for your use case
    if (error.response) {
      console.error(error.response.status, error.response.data);
      res.status(error.response.status).json(error.response.data);
    } else {
      console.error(`Error with OpenAI API request: ${error.message}`);
      res.status(500).json({
        error: {
          message: 'An error occurred during your request.',
        }
      });
    }
  }
}

function generatePrompt(animal) {
  const capitalizedAnimal =
    animal[0].toUpperCase() + animal.slice(1).toLowerCase();
  return `Sugerir o tipo de uma despesa baseada em uma descrição.

Descrição: Parada no restaurante
Tipo: Alimentação
Descrição: Parada para abastecer o carro
Tipo: Combustivel
Descrição: Viagem de uber até Blumenau
Tipo: Mobilidade
Descrição: Check-in no hotel
Tipo: Estadia
Descrição: ${capitalizedAnimal}
Tipo:`;
}
