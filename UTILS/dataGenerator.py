import pandas as pd
from sdv.single_table import CTGANSynthesizer
from sdv.metadata import SingleTableMetadata


df = pd.read_csv("Updated_HomeC.csv")


metadata = SingleTableMetadata()
metadata.detect_from_dataframe(data=df)


synthesizer = CTGANSynthesizer(metadata, epochs=500)


synthesizer.fit(df)


synthetic_data = synthesizer.sample(500)


synthetic_data.to_csv("synthetic_data.csv", index=False)

print(synthetic_data.head())