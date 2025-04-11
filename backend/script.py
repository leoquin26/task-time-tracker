import csv

def parse_rate(rate_str):
    """
    Toma una cadena con formato como "$24.50/hr" y devuelve el número 24.50.
    Si el valor es "-" o está vacío, devuelve 0.
    """
    if not rate_str or rate_str.strip() == '-':
        return 0.0
    # Quitar el símbolo de dólar y la parte "/hr"
    cleaned = rate_str.replace('$', '').replace('/hr', '').strip()
    try:
        return float(cleaned)
    except ValueError:
        return 0.0

total_rate = 0.0
item_count = 0  # Contador de items
csv_file = './uploads/Outlier_Earnings_Report (4).csv'  # Reemplaza con la ruta real de tu CSV

with open(csv_file, newline='', encoding='utf-8') as file:
    reader = csv.DictReader(file)
    for row in reader:
        payout = parse_rate(row['payout'])
        if payout > 0:  # Solo contamos si el payout es mayor que 0
            total_rate += payout
            item_count += 1

print("Total Rate Applied: ${:.2f}".format(total_rate))
print("Total Items Counted: {}".format(item_count))
