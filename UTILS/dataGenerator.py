from sdv.tabular import CTGAN  # Ensure the `sdv` library is installed with `pip install sdv`. Recommended version: `pip install sdv==1.4.0`.
import pandas as pd

#load the file to generate
df = pd.read_csv("Hourly_HomeC.csv")

# translate the text to category
df['summary'] = df['summary'].astype('category')
df['icon'] = df['icon'].astype('category')

# Training the model
model = CTGAN(epochs=500)
model.fit(df)

# creat 500 line of new data
synthetic_data = model.sample(500)

# show the new data
print(synthetic_data.head())