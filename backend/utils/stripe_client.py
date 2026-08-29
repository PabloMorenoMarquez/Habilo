import stripe
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from config import Config

stripe.api_key = Config.STRIPE_SECRET_KEY

def get_stripe():
    return stripe

def _es_error_transitorio(excepcion):
    return isinstance(excepcion, (stripe.error.APIConnectionError, stripe.error.RateLimitError))

stripe_retry = retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=0.5, min=0.5, max=4),
    retry=retry_if_exception_type((stripe.error.APIConnectionError, stripe.error.RateLimitError)),
    reraise=True,  # tras el último intento, propaga el error original — no lo enmascares
)

@stripe_retry
def stripe_call(func, *args, **kwargs):
    return func(*args, **kwargs)