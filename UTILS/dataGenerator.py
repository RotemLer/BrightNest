import pandas as pd
import os
from sdv.single_table import CTGANSynthesizer
from sdv.metadata import SingleTableMetadata

# קובץ קלט
csv_path = "Updated_HomeC.csv"
output_path = "synthetic_data.csv"

# בדיקה שהקובץ קיים
if not os.path.exists(csv_path):
    raise FileNotFoundError(f"❌ File not found: {csv_path}")

print("📥 Loading dataset...")
df = pd.read_csv(csv_path)

# גילוי מטאדאטה מהדאטה
print("🔍 Detecting metadata...")
metadata = SingleTableMetadata()
metadata.detect_from_dataframe(data=df)

# המרה ידנית של עמודות קטגוריאליות
for col in ['icon', 'summary']:
    if col in df.columns:
        metadata.update_column(column_name=col, sdtype='categorical')

# יצירת המודל
print("⚙️ Initializing CTGANSynthesizer...")
synthesizer = CTGANSynthesizer(metadata=metadata, epochs=500)

# אימון המודל
print("🚀 Fitting model... This may take a minute.")
synthesizer.fit(df)

# יצירת דאטה סינתטי
print("✨ Sampling synthetic data...")
synthetic_data = synthesizer.sample(500)
synthetic_data.to_csv(output_path, index=False)

print(f"✅ Synthetic data saved to: {output_path}")
print("📊 Preview:")
print(synthetic_data.head())