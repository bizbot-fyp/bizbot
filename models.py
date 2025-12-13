from mongoengine import (
    Document, EmbeddedDocument, StringField, ListField, ReferenceField,
    DateTimeField, BooleanField, DictField, EmbeddedDocumentField,
    IntField, URLField, FloatField
)
from datetime import datetime, timezone

utcnow = lambda: datetime.now(timezone.utc)


class User(Document):
    meta = {"collection": "users", "indexes": [{"fields": ["email"], "unique": True}, "username", "roles"]}

    username = StringField(required=True, unique=True)
    email = StringField(required=True, unique=True)
    password_hash = StringField(required=True)
    password_algo = StringField(default="bcrypt")
    roles = ListField(StringField(choices=["Business User", "Developer", "Administrator"]), required=True)
    contact_info = DictField()
    profile_picture_url = URLField()
    mfa_enabled = BooleanField(default=False)
    two_factor_secret = StringField()
    last_login = DateTimeField()
    account_status = StringField(choices=["active", "suspended", "deleted"], default="active")
    timezone = StringField()
    preferences = DictField()
    created_at = DateTimeField(default=utcnow)
    updated_at = DateTimeField(default=utcnow)


class Message(EmbeddedDocument):
    sender_id = StringField(required=True)
    sender_type = StringField(choices=["user", "bot", "agent"], required=True)
    content = StringField(required=True)
    timestamp = DateTimeField(required=True)
    status = StringField(choices=["sent", "received", "read"], default="sent")
    direction = StringField(choices=["inbound", "outbound"], default="inbound")
    language_detected = StringField()
    ai_confidence = FloatField()
    template_id = StringField()
    attachments = ListField(DictField())


class WhatsAppConversation(Document):
    meta = {
        "collection": "whatsapp_conversations",
        "indexes": [
            {"fields": ["business_id", "customer_phone"]},
            "-messages.timestamp",
            "assigned_agent_id",
        ]
    }

    user = ReferenceField(User, required=True)
    business_id = StringField(required=True)
    customer_phone = StringField(required=True)
    messages = ListField(EmbeddedDocumentField(Message))
    escalated_to_human = BooleanField(default=False)
    language_tag = StringField()
    conversation_status = StringField(choices=["open", "closed", "pending"], default="open")
    unread_message_count = IntField(default=0)
    assigned_agent_id = ReferenceField(User, null=True)
    conversation_tags = ListField(StringField())
    response_time_metrics = DictField()
    created_at = DateTimeField(default=utcnow)
    updated_at = DateTimeField(default=utcnow)


class KnowledgeBaseDocument(EmbeddedDocument):
    doc_id = StringField(required=True)
    title = StringField()
    content = StringField()
    version = IntField(default=1)
    author_info = DictField()
    metadata = DictField()
    embedding_present = BooleanField(default=False)
    created_at = DateTimeField(default=utcnow)
    updated_at = DateTimeField(default=utcnow)


class KnowledgeBase(Document):
    meta = {"collection": "knowledge_bases", "indexes": ["business_id"]}

    business_id = StringField(required=True)
    documents = ListField(EmbeddedDocumentField(KnowledgeBaseDocument))
    faqs = ListField(DictField())
    product_catalog = DictField()
    created_at = DateTimeField(default=utcnow)
    updated_at = DateTimeField(default=utcnow)
    access_permissions = StringField(choices=["public", "internal"], default="internal")
    author_info = DictField()


class SocialMediaContent(EmbeddedDocument):
    text = StringField(required=True)
    hashtags = ListField(StringField())
    scheduled_time = DateTimeField()
    platform = StringField(choices=["Facebook", "Instagram", "Twitter", "LinkedIn", "Other"])
    status = StringField(choices=["pending", "approved", "posted", "rejected"], default="pending")
    approval_history = ListField(DictField())
    attachments = ListField(DictField())
    created_at = DateTimeField(default=utcnow)
    updated_at = DateTimeField(default=utcnow)


class Campaign(Document):
    meta = {"collection": "campaigns", "indexes": [("business_id", "campaign_start_date")]}

    business_id = StringField(required=True)
    content_items = ListField(EmbeddedDocumentField(SocialMediaContent))
    approval_status = StringField(choices=["pending", "approved", "rejected"], default="pending")
    campaign_start_date = DateTimeField()
    campaign_end_date = DateTimeField()
    target_audience = DictField()
    budget = IntField()
    performance_metrics = DictField()
    approval_history = ListField(DictField())
    created_by = ReferenceField(User)
    updated_by = ReferenceField(User)
    created_at = DateTimeField(default=utcnow)
    updated_at = DateTimeField(default=utcnow)


class WorkflowAction(EmbeddedDocument):
    action_type = StringField(required=True)
    parameters = DictField()


class WorkflowExecutionEntry(EmbeddedDocument):
    execution_id = StringField()
    started_at = DateTimeField()
    finished_at = DateTimeField()
    status = StringField(choices=["success", "failed", "running"])
    error = StringField()
    run_metadata = DictField()


class Workflow(Document):
    meta = {"collection": "workflows", "indexes": ["business_id", "n8n_workflow_id"]}

    business_id = StringField(required=True)
    name = StringField()
    triggers = ListField(DictField())
    actions = ListField(EmbeddedDocumentField(WorkflowAction))
    status = StringField(choices=["active", "inactive"], default="active")
    n8n_workflow_id = StringField()
    retry_policy = DictField()
    execution_history = ListField(EmbeddedDocumentField(WorkflowExecutionEntry))
    error_handling = DictField()
    notification_settings = DictField()
    created_by = ReferenceField(User)
    modified_by = ReferenceField(User)
    version = IntField(default=1)
    audit_logs = ListField(DictField())
    created_at = DateTimeField(default=utcnow)
    updated_at = DateTimeField(default=utcnow)


class AuditLog(Document):
    meta = {"collection": "audit_logs", "indexes": [("user", "-timestamp"), "entity_type"]}

    user = ReferenceField(User)
    action = StringField(required=True)
    entity_type = StringField()
    target_entity = StringField()
    timestamp = DateTimeField(required=True)
    outcome = StringField()
    ip_address = StringField()
    session_id = StringField()
    change_description = StringField()
    device_info = StringField()
    created_at = DateTimeField(default=utcnow)
