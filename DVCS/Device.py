class Device:
    def __init__(self, name: str, power_usage: float):
        self.name = name
        self.power_usage = power_usage  # in kWh
        self.status = False  # off by default

    def turn_on(self):
        self.status = True
        print(f"{self.name} turned ON.")

    def turn_off(self):
        self.status = False
        print(f"{self.name} turned OFF.")

    def get_status(self):
        return "ON" if self.status else "OFF"

    def set_status(self, status):
        self.status=status