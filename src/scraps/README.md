# flow v2

user posts a message --> get the state of their session
    -- WAITING_FOR_INITIAL_SCRAP
        --> session enters the SESSION_PENDING state
    -- SESSION_PENDING
        --> log scrap
    -- WAITING_FOR_FINAL_SCRAP
        --> complete session 