package app.sdoc.document.config;

import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.annotation.EnableKafka;
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory;
import org.springframework.kafka.config.TopicBuilder;
import org.springframework.kafka.core.ConsumerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.listener.ContainerProperties;
import org.springframework.kafka.listener.DeadLetterPublishingRecoverer;
import org.springframework.kafka.listener.DefaultErrorHandler;
import org.springframework.kafka.support.ExponentialBackOffWithMaxRetries;
import org.apache.kafka.common.TopicPartition;

/**
 * Configuración Kafka del document-service.
 * Define el factory de consumers con DLQ y reintentos con backoff exponencial.
 */
@Configuration
@EnableKafka
public class KafkaConfig {

    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, Object> kafkaListenerContainerFactory(
            ConsumerFactory<String, Object> consumerFactory,
            KafkaTemplate<String, Object> kafkaTemplate
    ) {
        ConcurrentKafkaListenerContainerFactory<String, Object> factory =
                new ConcurrentKafkaListenerContainerFactory<>();

        factory.setConsumerFactory(consumerFactory);
        factory.getContainerProperties().setAckMode(ContainerProperties.AckMode.MANUAL);
        factory.setConcurrency(3);

        // DLQ — después de 3 reintentos con backoff exponencial, enviar al topic .dlq
        ExponentialBackOffWithMaxRetries backOff = new ExponentialBackOffWithMaxRetries(3);
        backOff.setInitialInterval(1_000L);
        backOff.setMultiplier(2.0);
        backOff.setMaxInterval(10_000L);

        factory.setCommonErrorHandler(new DefaultErrorHandler(
                new DeadLetterPublishingRecoverer(kafkaTemplate,
                        (record, ex) -> new TopicPartition(record.topic() + ".dlq", -1)
                ),
                backOff
        ));

        return factory;
    }

    @Bean
    public NewTopic documentCreatedTopic() {
        return TopicBuilder.name("sdoc.documents.created").partitions(6).replicas(1).build();
    }

    @Bean
    public NewTopic documentUpdatedTopic() {
        return TopicBuilder.name("sdoc.documents.updated").partitions(6).replicas(1).build();
    }

    @Bean
    public NewTopic documentDeletedTopic() {
        return TopicBuilder.name("sdoc.documents.deleted").partitions(3).replicas(1).build();
    }
}
