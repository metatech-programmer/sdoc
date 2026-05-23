package app.sdoc.document.domain.mapper;

import app.sdoc.document.domain.dto.DocumentResponse;
import app.sdoc.document.domain.dto.DocumentSummaryResponse;
import app.sdoc.document.domain.entity.Document;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.factory.Mappers;

/**
 * Mapper MapStruct para convertir entidades Document a DTOs de respuesta.
 * Singleton accesible via INSTANCE para uso fuera de Spring context.
 */
@Mapper
public interface DocumentMapper {

    DocumentMapper INSTANCE = Mappers.getMapper(DocumentMapper.class);

    @Mapping(source = "ownerId", target = "ownerId")
    @Mapping(source = "createdAt", target = "createdAt")
    @Mapping(source = "updatedAt", target = "updatedAt")
    DocumentResponse toResponse(Document document);

    @Mapping(source = "ownerId", target = "ownerId")
    @Mapping(source = "updatedAt", target = "updatedAt")
    DocumentSummaryResponse toSummaryResponse(Document document);
}
