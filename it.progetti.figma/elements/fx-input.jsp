<%@page buffer="none" session="false" pageEncoding="UTF-8" trimDirectiveWhitespaces="true"%>
<%@taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core"%>
<%@taglib prefix="fn" uri="http://java.sun.com/jsp/jstl/functions"%>
<%-- GENERATO da figma-storybook/scripts/export-opencms.mjs: non modificare a mano, cambia figma-storybook/src/components/input/input.template.js. --%>
<%-- Componente Figma "Input" (1:23). Parametri: id, name, type, label, placeholder, autocomplete --%>
<div class="fx-input">
    <label class="fx-input__label" for="${fn:escapeXml(param.id)}">${fn:escapeXml(param.label)}</label>
    <input class="fx-input__field" id="${fn:escapeXml(param.id)}" <c:if test="${not empty param.name}">name="${fn:escapeXml(param.name)}"</c:if> type="${empty param.type ? 'text' : fn:escapeXml(param.type)}" <c:if test="${not empty param.placeholder}">placeholder="${fn:escapeXml(param.placeholder)}"</c:if> <c:if test="${not empty param.autocomplete}">autocomplete="${fn:escapeXml(param.autocomplete)}"</c:if> required>
</div>
