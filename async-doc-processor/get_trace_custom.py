import traceback
try:
    from app.main import app
except Exception as e:
    with open("trace.txt", "w") as f:
        traceback.print_exc(file=f)
