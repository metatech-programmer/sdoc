package app.sdoc.commons.events;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

@Getter
@SuperBuilder
@NoArgsConstructor
public class UserRegisteredEvent extends AbstractDomainEvent {

    private String userId;
    private String email;
    private String fullName;
    private String plan;

    public UserRegisteredEvent(String userId, String email, String fullName, String plan) {
        super(userId);
        this.userId = userId;
        this.email = email;
        this.fullName = fullName;
        this.plan = plan;
    }

    @Override public String getEventType()     { return "USER_REGISTERED"; }
    @Override public String getAggregateType() { return "User"; }
}
