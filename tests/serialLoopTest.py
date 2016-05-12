import serial

# For testing serial input when TX and RX are connected together

ser = serial.Serial("/dev/ttyAMA0", timeout=5.0)

while(1):
        d_out= raw_input("skriv til port:")
        ser.write(d_out + '\n')

ser.close()
