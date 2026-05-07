### 여행 계획표 작성


from flask import Blueprint, render_template, jsonify, request, redirect, url_for, flash
from gnss_app.models.travel import db, TravelPlan, PlanItem
from gnss_app.views.auth_view import login_required

# 블루프린트 설정
bp = Blueprint("plan", __name__, url_prefix="/plan")

# 계획 짜기
@bp.route("/create", methods=["GET", "POST"])
@login_required
def create_plan():
    if request.method == "POST":
        title = request.form.get("title")
        days = request.form.getlist("day[]")
        places = request.form.getlist("place[]")
        memos = request.form.getlist("memo[]")

        # 여행 큰 틀 저장
        # TODO: 현재 유저가 속한 group_id를 가져오는 로직 필요 (임시로 1번 그룹 사용)
        new_plan = TravelPlan(group_id=1, title=title)
        db.session.add(new_plan)
        db.session.flush() # ID를 미리 따기 위해 플러시

        # 상세 장소들 저장
        for i in range(len(places)):
            item = PlanItem(
                plan_id=new_plan.id,
                day_number=int(days[i]),
                visit_order=i + 1,
                place_name=places[i],
                memo=memos[i]
            )
            db.session.add(item)

        db.session.commit()
        flash("계획 저장 완료!")
        return redirect(url_for('map.map_test')) # 저장 후 지도로 이동

    return render_template("plan_chart/plan_create.html")
