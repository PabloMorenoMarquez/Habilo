import stripe
from config import Config

stripe.api_key = Config.STRIPE_SECRET_KEY

def get_stripe():
    return stripe