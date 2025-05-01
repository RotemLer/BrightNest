# Smart Boiler Optimization using LSTM and Deep Q-Learning

This final-year Computer Science project from Afeka College presents a smart energy management system for residential electric water heaters. The goal is to reduce electricity consumption while maintaining user comfort by leveraging artificial intelligence.

The project combines two advanced techniques:

1. **LSTM-Based Forecasting** – A recurrent neural network model predicts hourly water temperature inside the boiler, using inputs such as ambient temperature, cloud coverage, boiler size (50L, 100L, or 150L), and presence of a solar heating system.

2. **Deep Q-Learning Optimization** – A reinforcement learning agent makes real-time decisions about when to activate the electric heater. The agent learns to reach the target water temperature at minimal energy cost, adapting to weather changes and user behavior over time.

To support both components, the project includes several key modules:
- A simulator that models boiler heat dynamics under various environmental and usage conditions
- A synthetic weather data generator trained on realistic patterns
- Training and evaluation scripts for both the forecasting model and the DQL agent
- A backend interface using FastAPI for potential integration with external systems

The code is written in Python 3.12, and utilizes TensorFlow/Keras for the neural networks, along with standard tools such as NumPy and Pandas for data handling. Training artifacts, performance visualizations, and realistic datasets (CSV-based) are included for reproducibility and further development.

To run the project, install the dependencies from `requirements.txt`, then run the forecasting or training scripts. Pretrained models and evaluation data are included to demonstrate the system’s effectiveness.

This project demonstrates how modern AI techniques can be applied to smart home environments to reduce energy consumption and increase automation. It is modular, well-documented, and ready to be extended for real-world applications or future research.

Developed by Rotem Ler, Dvir Siksik, Dan Krichley 
Afeka Tel Aviv Academic College of Engineering  
License: MIT
