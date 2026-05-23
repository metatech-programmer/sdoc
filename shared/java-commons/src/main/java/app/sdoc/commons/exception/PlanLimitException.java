package app.sdoc.commons.exception;

import org.springframework.http.HttpStatus;

public class PlanLimitException extends SdocException {

    public PlanLimitException(String limitName, String currentPlan) {
        super(
            "Límite del plan alcanzado: " + limitName + " (plan actual: " + currentPlan + ")",
            "PLAN_LIMIT_EXCEEDED",
            HttpStatus.PAYMENT_REQUIRED
        );
    }
}
