<%@page buffer="none" session="false" pageEncoding="UTF-8" trimDirectiveWhitespaces="true"%>
<%@taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core"%>
<%@taglib prefix="fn" uri="http://java.sun.com/jsp/jstl/functions"%>
<%-- Componente Figma "Input" (1:23). Parametri: id, name, type, label, placeholder, autocomplete --%>
<div class="fx-input">
    <label class="fx-input__label" for="${fn:escapeXml(param.id)}">${fn:escapeXml(param.label)}</label>
    <input class="fx-input__field"
        id="${fn:escapeXml(param.id)}"
        name="${fn:escapeXml(param.name)}"
        type="${empty param.type ? 'text' : fn:escapeXml(param.type)}"
        <c:if test="${not empty param.placeholder}">placeholder="${fn:escapeXml(param.placeholder)}"</c:if>
        <c:if test="${not empty param.autocomplete}">autocomplete="${fn:escapeXml(param.autocomplete)}"</c:if>
        required>
</div>
