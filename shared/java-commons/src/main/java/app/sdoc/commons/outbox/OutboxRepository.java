package app.sdoc.commons.outbox;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface OutboxRepository extends JpaRepository<OutboxEvent, UUID> {

    // PESSIMISTIC_WRITE para evitar procesamiento duplicado en múltiples instancias
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
        SELECT e FROM OutboxEvent e
        WHERE e.status = 'PENDING'
        ORDER BY e.createdAt ASC
        LIMIT :limit
        """)
    List<OutboxEvent> findPendingEventsWithLock(@Param("limit") int limit);

    @Query("SELECT COUNT(e) FROM OutboxEvent e WHERE e.status = 'PENDING'")
    long countPendingEvents();

    @Query("SELECT COUNT(e) FROM OutboxEvent e WHERE e.status = 'FAILED'")
    long countFailedEvents();
}
