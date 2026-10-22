<%@page buffer="none" session="false" pageEncoding="UTF-8" trimDirectiveWhitespaces="true"%>
<%@taglib prefix="cms" uri="http://www.opencms.org/taglib/cms"%>
<%@taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core"%>
<%-- Componente Figma "Button" (1:22). Settings: variant (primary|secondary), width (auto|full) --%>
<cms:formatter var="content" val="value">
<c:set var="variant" value="${cms.element.settings.variant eq 'secondary' ? 'secondary' : 'primary'}" />
<c:set var="full" value="${cms.element.settings.width eq 'full' ? ' fx-button--full' : ''}" />
<div class="fx-element fx-cta-button">
    <a class="fx-button fx-button--${variant}${full}" href="${value.Link.toLink}">${value.Text}</a>
</div>
</cms:formatter>
