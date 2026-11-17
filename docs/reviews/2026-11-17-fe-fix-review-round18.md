# 2026-11-17 리뷰 (18차: 탈퇴 30일 후 완전 삭제 배치)

대상
- BE `fit-core-backend`: `SchedulingConfig`, `domain/user/purge/WithdrawnUserDataPurger`, `WithdrawnUserPurgeService`, `WithdrawnUserPurgeScheduler`, 관련 설정과 테스트
- FE 문구: `app/privacy/page.tsx` 4·5번, 설정 탈퇴 시트(`app/my/settings/Settings.tsx`), `app/terms/page.tsx`

데이터를 영구 삭제하는 기능이므로 반대 입장에서 검토했습니다.

**결과: P0 0건, P1 0건, P2 1건.**
- 이전 라운드까지 남아 있던 정책 항목(보관 기간)은 사용자 결정("30일 후 완전 삭제")대로 구현되어 닫혔습니다.

## 자동 검증

| 항목 | 결과 |
|---|---|
| BE `./gradlew test` | BUILD SUCCESSFUL. 테스트 프로필은 H2 MySQL 모드 + Flyway 스키마라 FK가 적용된 상태에서 삭제 순서가 실행됨 |
| `WithdrawnUserPurgeServiceTest` | 31일 지난 사용자 삭제, 29일 사용자와 활성 사용자는 유지, 다시 실행해도 변화 없음, 배치 크기 1 |
| 테스트 프로필 | `app.withdrawal-purge.enabled: false`. 스케줄러가 테스트 중에 돌지 않음 |

## 반대 입장 검토

### 1. 활성 사용자나 탈퇴하지 않은 사용자가 대상이 될 수 있는가 → 없음

**대상 조건**
- 조회와 삭제 직전 재확인 모두 `is_deleted = 1 AND deleted_at IS NOT NULL AND deleted_at <= cutoff`입니다.
- 마지막 `DELETE FROM user_profiles`에도 `AND is_deleted = 1`이 붙어 있습니다.

**`is_deleted = 1`이 되는 경로**
- `user_profiles.is_deleted`(TINYINT)를 1로 만드는 경로는 `UserService.withdrawMe`의 `userRepository.delete(user)`(`@SoftDelete`) 하나뿐입니다.
- `markAsDeleted`/`withdraw(`/`userRepository.delete`를 모두 grep해서 확인했습니다. 관리자 삭제나 다른 소프트 삭제 경로는 없습니다.
- `deleted_at`은 `withdraw()`→`markAsDeleted`에서 같은 트랜잭션 안에서 설정됩니다.

**같은 이메일로 다시 가입하는 경우**
- 탈퇴할 때 이메일은 `withdrawn+{userId}@…`로 바뀌고 소셜 연결은 삭제됩니다.
- 다시 가입하면 새 `user_id`(is_deleted=0)가 생깁니다.
- 배치는 탈퇴한 `user_id`로만 지우므로 새 계정에는 영향이 없습니다. 하위 테이블도 모두 `user_id` 또는 그 사용자의 program·session id 기준입니다.

**시간대**
- `deleted_at`은 JVM 기본 시간대의 `LocalDateTime.now()`로 기록됩니다.
- 배치도 같은 JVM의 `LocalDateTime.now()`로 cutoff를 계산합니다.
- `hibernate.jdbc.time_zone` 설정이 없으므로 JPA로 쓸 때와 JdbcTemplate로 비교할 때 변환 차이가 없습니다.
- cron의 `zone = Asia/Seoul`은 실행 시각에만 영향을 줍니다.
- 남는 위험: 배포 중 컨테이너 시간대가 바뀌면 최대 9시간 차이가 날 수 있습니다. 30일에 비하면 무시할 수 있습니다.

**여러 인스턴스가 동시에 실행될 때**
- 두 트랜잭션이 같은 사용자를 지우려 해도 행 잠금으로 순서가 정해집니다. 두 번째는 0건을 지우고 끝납니다.
- 재확인 조건 때문에 중복 삭제나 잘못된 삭제는 생기지 않습니다.

### 2. 빠진 사용자 테이블이 있는가 → BE 소유 테이블은 모두 포함, AI 테이블 1개 누락(P2-1)

**BE 스키마**
- Flyway 마이그레이션 V1~V13과 `schema.sql`에서 `user_id` 컬럼을 가진 테이블은 `user_profiles`, `social_accounts`, `routine_drafts`, `routine_finals`, `workout_sessions`, `diet_logs`, `nutrition_targets`, `routine_programs`입니다(8개, 모두 포함).
- 하위 테이블 `workout_sets`, `routine_program_items`, `routine_program_completion_events`도 포함됩니다.
- `user_id`를 가진 JPA 엔티티 8개와도 일치합니다.
- MyBatis 매퍼 XML은 없습니다.

**AI 소유 테이블**
- `routine_feedback`은 `fit-core-ai/models/routine_feedback.py`가 만들고, 같은 DB(`fit_core`)에 `user_id` 컬럼이 있습니다. 배치에 포함되지 않았습니다(아래 P2-1).

### 3. FK 순서, 일부만 지워질 위험 → 문제없음

**FK 순서**

| FK | 삭제 순서 |
|---|---|
| completion_events → items·programs·sessions | 먼저 |
| items → programs·finals | 그다음 |
| sets → sessions | sessions보다 먼저 |
| finals → drafts | drafts보다 먼저 |
| social_accounts → user_profiles | user_profiles는 마지막 |

**부분 실패**
- `purgeUser`는 사용자마다 `@Transactional`이고, 다른 빈(`WithdrawnUserPurgeService`)에서 호출되므로 프록시가 적용됩니다.
- 중간에 실패하면 그 사용자 전체가 롤백되고, 그 실행에서는 건너뛴 뒤 다음 날 다시 시도합니다.
- 고아 행이 남지 않습니다.

### 4. 기본값이 켜져 있는 위험 → 낮음

- 탈퇴 API 자체가 이번 작업에서 새로 생겼습니다. 기존 dev DB에 `is_deleted=1` 사용자가 생길 경로는 이번 탈퇴 기능이 유일합니다.
- 시드 SQL에 `user_profiles` INSERT가 없습니다.
- 데모 모드는 FE 전용이라 BE 행이 없습니다.
- 따라서 기존 DB에서 의도하지 않은 대량 삭제가 일어날 가능성은 낮습니다.
- 운영 메모: 같은 사용자가 계속 실패하면(예: 다른 데이터가 FK로 참조) 30일이 지나도 데이터가 남습니다. 지금은 `log.error`만 남기므로, 반복 실패 알림이 있으면 좋습니다.

### 5. 문구와 실제 동작 → P2-1을 빼면 일치

| 문구 | 실제 |
|---|---|
| 탈퇴하면 바로 익명화(이름·닉네임·사진·성별·생년월일·체중·체성분·기준 중량·통증·근육통·운동 설정·메모 삭제, 이메일 변경, 소셜 연결 삭제) | `withdraw()`·`withdrawMe` 그대로 ✅ |
| 이전 로그인 정보로 접속 불가 | `JwtFilter` 401(3차 확인) ✅ |
| 운동·식단·영양 목표·AI 루틴 기록은 30일 보관, 그동안 다시 볼 수 없음 | 소프트 삭제된 계정에 연결된 채 남음 ✅ |
| 30일이 지나면 운동·식단·루틴 기록, 탈퇴 기록(시각·IP), 익명 계정까지 완전히 삭제 | 매일 04:00 배치가 `deleted_at + 30일`이 지난 사용자의 위 테이블 전체와 `user_profiles` 행(`deleted_at`, `deleted_ip` 포함)을 삭제 ✅. 실제로는 30일이 지난 뒤 다음 04:00에 지워지므로 최대 하루 늦어질 수 있지만, "지나면"이라는 표현과 맞음 |
| 이용약관·설정 시트 "30일 뒤 완전히 지워져 되살릴 수 없음" | 같음 ✅ |
| "모두 완전히 지워요" | `routine_feedback`는 지워지지 않음 ❌(P2-1) |

---

## P2 — 개선

### P2-1. AI 서버의 `routine_feedback`(같은 DB, `user_id` 있음)이 삭제 대상에서 빠짐
- 위치: `fit-core-ai/models/routine_feedback.py`(`__tablename__="routine_feedback"`, `user_id` 컬럼). AI 서버 기본 `DATABASE_URL`은 BE와 같은 `fit_core` DB입니다.
- 현재 상태
  - BE에는 `/api/ai/routine-feedback`을 호출하는 코드가 없습니다(1차 점검과 같음). 그래서 FE 사용자 흐름으로는 행이 생기지 않습니다.
  - 하지만 AI 엔드포인트를 직접 호출하거나 나중에 연결하면 사용자 피드백이 `user_id`와 함께 쌓입니다.
  - 그 경우 개인정보 처리방침의 "모두 완전히 지워요"가 사실과 달라집니다.
- 기대: 다음 중 하나여야 합니다.
  - `WithdrawnUserDataPurger`에 `DELETE FROM routine_feedback WHERE user_id = :userId`를 추가합니다. 테이블이 없는 환경도 고려해 존재 여부를 확인합니다.
  - 또는 AI 피드백 저장에 `user_id`를 쓰지 않도록 정합니다.
  - 그리고 "사용자 소유 테이블이 생기면 `DELETE_STEPS`에 추가" 주석에 AI 쪽 테이블도 포함한다고 적습니다.

## 참고 (건수에 넣지 않음)
- **로그의 userId**: 배치 로그(`purged userId=…`)와 기존 요청 로그에는 탈퇴 사용자의 `user_id`(UUID)가 남습니다. 내용 없는 가명 식별자라 문제는 작지만, 로그 보관 기간을 정해 두면 방침과 더 잘 맞습니다.
- **DB 백업**: 방침에 백업 언급이 없습니다. 운영 DB 백업이 있다면 백업 보관 기간 안에서는 삭제된 데이터가 남는다는 점을 방침에 적어야 할 수 있습니다(법무 확인).
